import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";

import type { HiveMetricsResponse } from "shared";
import { API_BASE, HIVE_METRICS_STALE_AFTER_MS, ROUTES } from "shared";

import { buildApp } from "../../../../../back-end/src/app";
import type { HiveConfig } from "../../../../../back-end/src/core/server-config";
import { buildHivePublicMetrics } from "../../../../../back-end/src/features/hive/hive-public-metrics";
import type { FetchLike } from "../../../../../back-end/src/features/hive/hive-upstream";
import type { HiveMetricsRouteOptions } from "../../../../../back-end/src/features/hive/register-hive-metrics-route";
import { buildRepoPrActivity } from "../../../../../back-end/src/features/hive/repo-pr-activity";
import { createViewStore } from "../../../../../back-end/src/features/views/view-store";

const URL_PATH = `${API_BASE}${ROUTES.HIVE_METRICS}`;

const NOW = new Date("2026-11-02T15:00:00Z");

const BASE_URL = "http://hive.test:3001";

const GITHUB_URL
  = "https://api.github.com/repos/Tim-van-Oudheusden/website/pulls?state=all&sort=updated&direction=desc&per_page=100";

const CONFIGURED: HiveConfig = { baseUrl: BASE_URL, widgetToken: "widget-secret", production: true };

/** The recorded answer of each of the five upstream URLs. */
const FIXTURE_BY_URL: Readonly<Record<string, string>> = {
  [`${BASE_URL}/api/health`]: "health",
  [`${BASE_URL}/api/widget/summary`]: "widget-summary",
  [`${BASE_URL}/api/contribute/metrics`]: "contribute-metrics",
  [`${BASE_URL}/api/contribute/run-stats`]: "run-stats",
  [GITHUB_URL]: "github-pulls",
};

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(import.meta.dir, "fixtures", `${name}.json`), "utf8"));
}

/** The metrics the builders make from the recorded answers, with the repo window ending at `NOW`. */
const FIXTURE_METRICS = {
  ...buildHivePublicMetrics({
    health: fixture("health"),
    widget: fixture("widget-summary"),
    contributeMetrics: fixture("contribute-metrics"),
    runStats: fixture("run-stats"),
  }),
  repo: buildRepoPrActivity(fixture("github-pulls"), NOW),
};

interface FakeUpstream {
  calls: { url: string; init: RequestInit }[];
  fetch: FetchLike;
}

/** A fetch that records every call and answers with `answer`. */
function fakeFetch(answer: (url: string) => Response | Promise<Response>): FakeUpstream {
  const calls: FakeUpstream["calls"] = [];

  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });

      return answer(url);
    },
  };
}

function failing(): Response {
  return new Response("down", { status: 503 });
}

function recorded(url: string): Response {
  const name = FIXTURE_BY_URL[url];

  return name === undefined ? new Response("not found", { status: 404 }) : Response.json(fixture(name));
}

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function startWith(hive: HiveMetricsRouteOptions): Promise<FastifyInstance> {
  app = await buildApp({ contentDir: import.meta.dir, logger: false }, createViewStore(":memory:"), hive);

  return app;
}

async function start(
  config: HiveConfig,
  upstream: FakeUpstream,
  clock = { t: NOW.getTime() },
): Promise<FastifyInstance> {
  return startWith({ config, fetch: upstream.fetch, now: () => new Date(clock.t) });
}

async function getMetrics(
  server: FastifyInstance,
): Promise<{ status: number; body: HiveMetricsResponse; cacheControl: unknown }> {
  const response = await server.inject({ method: "GET", url: URL_PATH });

  return {
    status: response.statusCode,
    body: response.json<HiveMetricsResponse>(),
    cacheControl: response.headers["cache-control"],
  };
}

describe("GET /api/hive/metrics without HIVE_BASE_URL", () => {
  test("in production answers unavailable while nothing was ever fetched", async () => {
    const server = await start({ baseUrl: null, widgetToken: null, production: true }, fakeFetch(failing));

    const { status, body } = await getMetrics(server);

    expect(status).toBe(200);
    expect(body).toEqual({ state: "unavailable", fetchedAt: null, metrics: null });
  });

  test("in production still serves the GitHub part, calling only GitHub", async () => {
    const upstream = fakeFetch(recorded);
    const server = await start({ baseUrl: null, widgetToken: "widget-secret", production: true }, upstream);

    const { body } = await getMetrics(server);

    expect(upstream.calls.map(({ url }) => url)).toEqual([GITHUB_URL]);

    expect(body).toEqual({
      state: "live",
      fetchedAt: NOW.toISOString(),
      metrics: { online: false, hive: null, contributors: null, repo: FIXTURE_METRICS.repo },
    });
  });

  test("in development serves the checked-in fixture without calling anything", async () => {
    const upstream = fakeFetch(failing);
    const server = await start({ baseUrl: null, widgetToken: null, production: false }, upstream);

    const { status, body } = await getMetrics(server);

    expect(status).toBe(200);
    expect(body).toEqual({ state: "live", fetchedAt: NOW.toISOString(), metrics: FIXTURE_METRICS });
    expect(upstream.calls).toEqual([]);
  });
});

describe("GET /api/hive/metrics upstream calls", () => {
  test("requests exactly the four Hive URLs and the GitHub pull list, as GET", async () => {
    const upstream = fakeFetch(recorded);
    const server = await start(CONFIGURED, upstream);

    const { status, body } = await getMetrics(server);

    expect(status).toBe(200);
    expect(upstream.calls.map(({ url }) => url).sort()).toEqual(Object.keys(FIXTURE_BY_URL).sort());
    expect(upstream.calls.map(({ init }) => init.method)).toEqual(["GET", "GET", "GET", "GET", "GET"]);
    expect(body).toEqual({ state: "live", fetchedAt: NOW.toISOString(), metrics: FIXTURE_METRICS });
  });

  test("sends the widget token only to the widget summary", async () => {
    const upstream = fakeFetch(recorded);
    const server = await start(CONFIGURED, upstream);

    await getMetrics(server);

    const tokens = Object.fromEntries(
      upstream.calls.map(({ url, init }) => [url, new Headers(init.headers).get("X-Hive-Widget-Token")]),
    );

    expect(tokens).toEqual({
      [`${BASE_URL}/api/health`]: null,
      [`${BASE_URL}/api/widget/summary`]: "widget-secret",
      [`${BASE_URL}/api/contribute/metrics`]: null,
      [`${BASE_URL}/api/contribute/run-stats`]: null,
      [GITHUB_URL]: null,
    });
  });

  test("without a widget token skips the widget summary and serves the other parts", async () => {
    const upstream = fakeFetch(recorded);
    const server = await start({ ...CONFIGURED, widgetToken: null }, upstream);

    const { body } = await getMetrics(server);

    expect(upstream.calls.map(({ url }) => url)).not.toContain(`${BASE_URL}/api/widget/summary`);

    expect(body).toEqual({
      state: "live",
      fetchedAt: NOW.toISOString(),
      metrics: { ...FIXTURE_METRICS, hive: null },
    });
  });

  test("asks GitHub for its versioned JSON with a User-Agent", async () => {
    const upstream = fakeFetch(recorded);
    const server = await start(CONFIGURED, upstream);

    await getMetrics(server);

    const github = upstream.calls.find(({ url }) => url === GITHUB_URL);
    const headers = new Headers(github?.init.headers);

    expect(headers.get("Accept")).toBe("application/vnd.github+json");
    expect(headers.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(headers.get("User-Agent")).toBeTruthy();
  });
});

describe("GET /api/hive/metrics GitHub paging", () => {
  const [template] = fixture("github-pulls") as Record<string, unknown>[];

  /** A page of `size` pulls opened and updated inside the window ending at `NOW`. */
  function page(size: number): Record<string, unknown>[] {
    return Array.from({ length: size }, () => ({
      ...template,
      created_at: "2026-11-01T12:00:00Z",
      updated_at: "2026-11-01T12:00:00Z",
    }));
  }

  function githubPages(pages: readonly Record<string, unknown>[][]): (url: string) => Response {
    return (url) => {
      const number = url === GITHUB_URL ? 1 : Number(url.replace(`${GITHUB_URL}&page=`, ""));
      const answer = url.startsWith(GITHUB_URL) ? pages[number - 1] : undefined;

      return answer === undefined ? recorded(url) : Response.json(answer);
    };
  }

  function githubUrls(upstream: FakeUpstream): string[] {
    return upstream.calls.map(({ url }) => url).filter((url) => url.startsWith("https://api.github.com/"));
  }

  test("follows full in-window pages, at most three", async () => {
    const pages = [page(100), page(100), page(100), page(100)];
    const upstream = fakeFetch(githubPages(pages));
    const server = await start(CONFIGURED, upstream);

    const { body } = await getMetrics(server);

    expect(githubUrls(upstream)).toEqual([GITHUB_URL, `${GITHUB_URL}&page=2`, `${GITHUB_URL}&page=3`]);
    expect(body.metrics?.repo).toEqual(buildRepoPrActivity(pages.slice(0, 3).flat(), NOW));
  });

  test("stops at a page that is not full", async () => {
    const pages = [page(100), page(40), page(100)];
    const upstream = fakeFetch(githubPages(pages));
    const server = await start(CONFIGURED, upstream);

    const { body } = await getMetrics(server);

    expect(githubUrls(upstream)).toEqual([GITHUB_URL, `${GITHUB_URL}&page=2`]);
    expect(body.metrics?.repo).toEqual(buildRepoPrActivity(pages.slice(0, 2).flat(), NOW));
  });

  test.each([403, 429])("after a %i rate limit keeps the last value and waits for x-ratelimit-reset", async (status) => {
    const resetAt = NOW.getTime() + 900_000;
    let limited = false;
    const upstream = fakeFetch((url) => (limited && url.startsWith(GITHUB_URL)
      ? new Response("rate limited", {
          status,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(resetAt / 1000) },
        })
      : recorded(url)));
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    limited = true;
    clock.t += 180_000;
    upstream.calls.length = 0;

    const { body } = await getMetrics(server);

    expect(githubUrls(upstream)).toEqual([GITHUB_URL]);
    expect(body.metrics?.repo).toEqual(FIXTURE_METRICS.repo);

    clock.t = resetAt - 1;
    await getMetrics(server);
    expect(githubUrls(upstream)).toEqual([GITHUB_URL]);

    clock.t = resetAt;
    await getMetrics(server);
    expect(githubUrls(upstream)).toEqual([GITHUB_URL, GITHUB_URL]);
  });

  test("a rate limit without a readable reset retries after the usual 180 s", async () => {
    let limited = false;
    const upstream = fakeFetch((url) => (limited && url.startsWith(GITHUB_URL)
      ? new Response("rate limited", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "soon" },
        })
      : recorded(url)));
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    limited = true;
    clock.t += 180_000;
    await getMetrics(server);
    clock.t += 180_000;
    upstream.calls.length = 0;

    await getMetrics(server);

    expect(githubUrls(upstream)).toEqual([GITHUB_URL]);
  });
});

describe("GET /api/hive/metrics cache", () => {
  test("refreshes health and the widget after 60 s, the contributor endpoints and GitHub after 180 s", async () => {
    const upstream = fakeFetch(recorded);
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    upstream.calls.length = 0;

    clock.t += 59_999;
    await getMetrics(server);
    expect(upstream.calls).toEqual([]);

    clock.t += 1;
    await getMetrics(server);

    expect(upstream.calls.map(({ url }) => url).sort()).toEqual([
      `${BASE_URL}/api/health`,
      `${BASE_URL}/api/widget/summary`,
    ]);

    upstream.calls.length = 0;

    clock.t += 120_000;
    await getMetrics(server);
    expect(upstream.calls.map(({ url }) => url).sort()).toEqual(Object.keys(FIXTURE_BY_URL).sort());
  });

  test("a failing upstream keeps its last good value", async () => {
    let down = false;
    const upstream = fakeFetch((url) => {
      if (down && url === `${BASE_URL}/api/widget/summary`) {
        throw new TypeError("fetch failed");
      }

      return down && url === `${BASE_URL}/api/health` ? failing() : recorded(url);
    });
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    down = true;
    clock.t += 60_000;
    upstream.calls.length = 0;

    const { body } = await getMetrics(server);

    expect(upstream.calls).toHaveLength(2);
    expect(body).toEqual({ state: "live", fetchedAt: NOW.toISOString(), metrics: FIXTURE_METRICS });
  });
});

describe("GET /api/hive/metrics state", () => {
  test("turns stale once kept data is older than HIVE_METRICS_STALE_AFTER_MS", async () => {
    let down = false;
    const upstream = fakeFetch((url) => (down ? failing() : recorded(url)));
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    down = true;

    clock.t = NOW.getTime() + HIVE_METRICS_STALE_AFTER_MS;

    expect((await getMetrics(server)).body).toEqual({
      state: "live",
      fetchedAt: NOW.toISOString(),
      metrics: FIXTURE_METRICS,
    });

    clock.t += 1;

    expect((await getMetrics(server)).body).toEqual({
      state: "stale",
      fetchedAt: NOW.toISOString(),
      metrics: FIXTURE_METRICS,
    });
  });

  test("is stale when any kept part is too old, with fetchedAt the newest answer", async () => {
    let githubDown = false;
    const upstream = fakeFetch((url) => (githubDown && url === GITHUB_URL ? failing() : recorded(url)));
    const clock = { t: NOW.getTime() };
    const server = await start(CONFIGURED, upstream, clock);

    await getMetrics(server);
    githubDown = true;
    clock.t += HIVE_METRICS_STALE_AFTER_MS + 1;

    const { body } = await getMetrics(server);

    expect(body).toEqual({
      state: "stale",
      fetchedAt: new Date(clock.t).toISOString(),
      metrics: FIXTURE_METRICS,
    });
  });

  test("a part that never answered is blank and keeps the rest live", async () => {
    const upstream = fakeFetch((url) => (url === `${BASE_URL}/api/widget/summary` ? failing() : recorded(url)));
    const server = await start(CONFIGURED, upstream);

    const { body } = await getMetrics(server);

    expect(body).toEqual({ state: "live", fetchedAt: NOW.toISOString(), metrics: { ...FIXTURE_METRICS, hive: null } });
  });
});

describe("GET /api/hive/metrics response", () => {
  test("lets browsers and the edge cache it for 30 s", async () => {
    const server = await start(CONFIGURED, fakeFetch(recorded));

    expect((await getMetrics(server)).cacheControl).toBe("public, max-age=30");
  });

  test.each([
    ["a body that is not JSON", () => new Response("<html>oops</html>")],
    ["JSON of the wrong shape", () => Response.json({ status: ["ok"], history: "none", agents: 7 })],
    ["a fetch that throws at once", () => {
      throw new TypeError("bad URL");
    }],
  ])("answers 200 when every upstream sends %s", async (_label, answer: () => Response) => {
    const upstream: FakeUpstream = {
      calls: [],
      fetch: () => Promise.resolve(answer()),
    };
    const server = await start(CONFIGURED, upstream);

    expect((await getMetrics(server)).status).toBe(200);
  });

  test("answers 200 unavailable when building the response throws", async () => {
    app = await startWith({
      config: CONFIGURED,
      fetch: fakeFetch(recorded).fetch,
      now: () => {
        throw new Error("clock broke");
      },
    });

    const { status, body } = await getMetrics(app);

    expect(status).toBe(200);
    expect(body).toEqual({ state: "unavailable", fetchedAt: null, metrics: null });
  });
});
