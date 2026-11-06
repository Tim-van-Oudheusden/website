import { describe, expect, mock, test } from "bun:test";

import type { FetchLike } from "../../../../../back-end/src/features/hive/hive-upstream";
import { createHiveUpstream } from "../../../../../back-end/src/features/hive/hive-upstream";

const NOW = new Date("2026-11-02T15:00:00Z");

const HIVE_CONFIG = { baseUrl: "http://hive.test:3001", widgetToken: "widget-secret", production: true };

/** A fetch answering GitHub with `[]` and Hive URLs with `{ url }`, unless a key of `answers` is in the URL. */
function fetchWith(answers: Readonly<Record<string, () => Response>>): FetchLike {
  return (url) => {
    const answer = Object.entries(answers).find(([fragment]) => url.includes(fragment));

    if (answer !== undefined) {
      return Promise.resolve(answer[1]());
    }

    return Promise.resolve(Response.json(url.startsWith("https://api.github.com/") ? [] : { url }));
  };
}

describe("Hive upstream", () => {
  test("concurrent reads share one in-flight call per URL", async () => {
    const { promise: released, resolve: release } = Promise.withResolvers<undefined>();
    const urls: string[] = [];
    const onUnavailable = mock();
    const upstream = createHiveUpstream({
      config: HIVE_CONFIG,
      fetch: async (url) => {
        urls.push(url);
        await released;

        return Response.json(url.startsWith("https://api.github.com/") ? [] : { url });
      },
      now: () => NOW,
      timeoutMs: 5_000,
      onUnavailable,
    });

    const reads = Promise.all([upstream.read(), upstream.read(), upstream.read()]);

    release(undefined);

    const answers = await reads;

    expect(urls).toHaveLength(5);

    for (const answer of answers) {
      expect(Object.values(answer).filter((reading) => reading !== null)).toHaveLength(5);
      expect(answer.health).toEqual({ value: { url: "http://hive.test:3001/api/health" }, fetchedAt: NOW });
    }

    expect(onUnavailable).not.toHaveBeenCalled();
  });

  test("gives up on a call that outlasts the timeout and keeps the other parts", async () => {
    // AbortSignal.timeout runs on the real clock, so this waits the 1 ms timeout for real.
    const onUnavailable = mock();
    const upstream = createHiveUpstream({
      config: { baseUrl: "http://hive.test:3001", widgetToken: null, production: true },
      fetch: async (url, init) => {
        if (url.endsWith("/api/health")) {
          const { promise, reject } = Promise.withResolvers<Response>();

          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("timed out", "TimeoutError"));
          });

          return promise;
        }

        return Response.json({ url });
      },
      now: () => NOW,
      timeoutMs: 1,
      onUnavailable,
    });

    const answer = await upstream.read();

    expect(answer.health).toBeNull();

    expect(answer.runStats).toEqual({
      value: { url: "http://hive.test:3001/api/contribute/run-stats" },
      fetchedAt: NOW,
    });

    expect(onUnavailable).toHaveBeenCalledWith("health", "TimeoutError: timed out");
  });

  test("reports each failed part by name, with its status or error", async () => {
    const onUnavailable = mock();
    const upstream = createHiveUpstream({
      config: HIVE_CONFIG,
      fetch: fetchWith({
        "/api/widget/summary": () => new Response("no", { status: 401 }),
        "/api/health": () => new Response("<html>"),
        "api.github.com": () => {
          throw new TypeError("connection refused");
        },
      }),
      now: () => NOW,
      timeoutMs: 5_000,
      onUnavailable,
    });

    await upstream.read();

    const reasons = new Map(onUnavailable.mock.calls as [string, string][]);

    expect([...reasons.keys()].sort()).toEqual(["health", "pulls", "widget"]);
    expect(reasons.get("widget")).toBe("status 401");
    expect(reasons.get("health")).toStartWith("SyntaxError: ");
    expect(reasons.get("pulls")).toBe("TypeError: connection refused");
  });

  test("reports a pull list answer that is not a list", async () => {
    const onUnavailable = mock();
    const upstream = createHiveUpstream({
      config: { ...HIVE_CONFIG, baseUrl: null },
      fetch: fetchWith({ "api.github.com": () => Response.json({ message: "moved" }) }),
      now: () => NOW,
      timeoutMs: 5_000,
      onUnavailable,
    });

    await upstream.read();

    expect(onUnavailable.mock.calls).toEqual([["pulls", "answer is not a list"]]);
  });

  test("reports a rate limit once, not on the reads held off until it resets", async () => {
    const clock = { t: NOW.getTime() };
    const resetSeconds = NOW.getTime() / 1000 + 3600;
    const onUnavailable = mock();
    const upstream = createHiveUpstream({
      config: { ...HIVE_CONFIG, baseUrl: null },
      fetch: fetchWith({
        "api.github.com": () => new Response("limited", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(resetSeconds) },
        }),
      }),
      now: () => new Date(clock.t),
      timeoutMs: 5_000,
      onUnavailable,
    });

    await upstream.read();
    clock.t += 1_800_000;
    await upstream.read();

    expect(onUnavailable.mock.calls).toEqual([["pulls", "status 403"]]);
  });
});
