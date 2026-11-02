import { describe, expect, test } from "bun:test";

import { createHiveUpstream } from "../../../../../back-end/src/features/hive/hive-upstream";

const NOW = new Date("2026-11-02T15:00:00Z");

describe("Hive upstream", () => {
  test("concurrent reads share one in-flight call per URL", async () => {
    const { promise: released, resolve: release } = Promise.withResolvers<undefined>();
    const urls: string[] = [];
    const upstream = createHiveUpstream({
      config: { baseUrl: "http://hive.test:3001", widgetToken: "widget-secret", production: true },
      fetch: async (url) => {
        urls.push(url);
        await released;

        return Response.json(url.startsWith("https://api.github.com/") ? [] : { url });
      },
      now: () => NOW,
      timeoutMs: 5_000,
    });

    const reads = Promise.all([upstream.read(), upstream.read(), upstream.read()]);

    release(undefined);

    const answers = await reads;

    expect(urls).toHaveLength(5);

    for (const answer of answers) {
      expect(Object.values(answer).filter((reading) => reading !== null)).toHaveLength(5);
      expect(answer.health).toEqual({ value: { url: "http://hive.test:3001/api/health" }, fetchedAt: NOW });
    }
  });

  test("gives up on a call that outlasts the timeout and keeps the other parts", async () => {
    // AbortSignal.timeout runs on the real clock, so this waits the 1 ms timeout for real.
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
    });

    const answer = await upstream.read();

    expect(answer.health).toBeNull();

    expect(answer.runStats).toEqual({
      value: { url: "http://hive.test:3001/api/contribute/run-stats" },
      fetchedAt: NOW,
    });
  });
});
