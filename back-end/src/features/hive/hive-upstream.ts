import type { HiveConfig } from "../../core/server-config";

import { needsNextPage, PAGE_SIZE } from "./repo-pr-activity";

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Longest wait for one upstream call. */
export const UPSTREAM_TIMEOUT_MS = 5_000;

/** The public repo whose pull requests feed the `repo` part. */
const PR_STATS_REPOSITORY = "Tim-van-Oudheusden/website";

const GITHUB_PULLS_URL
  = `https://api.github.com/repos/${PR_STATS_REPOSITORY}/pulls?state=all&sort=updated&direction=desc&per_page=${String(PAGE_SIZE)}`;

/** Most GitHub pages fetched per refresh. */
const MAX_GITHUB_PAGES = 3;

/** GitHub's REST headers; it rejects requests without a User-Agent. */
const GITHUB_HEADERS: Readonly<Record<string, string>> = {
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "buildwithtim.dev hive metrics",
};

/** Cache lifetime of health and the widget summary. */
const FAST_TTL_MS = 60_000;

/** Cache lifetime of the contributor endpoints and GitHub. */
const SLOW_TTL_MS = 180_000;

/** The last good answer of one upstream part. */
export interface PartReading {
  value: unknown;
  /** When `value` was fetched. */
  fetchedAt: Date;
}

type PartName = "health" | "widget" | "contributeMetrics" | "runStats" | "pulls";

/** The last good answer of each configured part; `null` when it never succeeded. Unconfigured parts are absent. */
export type UpstreamReadings = Partial<Record<PartName, PartReading | null>>;

export interface HiveUpstream {
  /** Refreshes the parts whose cache expired, then returns every part's last good answer. */
  read(): Promise<UpstreamReadings>;
}

export interface HiveUpstreamOptions {
  config: HiveConfig;
  fetch: FetchLike;
  now: () => Date;
  /** Per-call timeout; `UPSTREAM_TIMEOUT_MS` outside tests. */
  timeoutMs: number;
}

/** One upstream answer: the parsed JSON, or null on failure. `retryAt` (epoch ms) holds off the next try. */
interface Loaded {
  value: unknown;
  retryAt: number | null;
}

/** When GitHub's rate limit resets (epoch ms), if `response` says it is used up and names a readable reset time. */
function rateLimitReset(response: Response): number | null {
  const limited = (response.status === 403 || response.status === 429)
    && response.headers.get("x-ratelimit-remaining") === "0";
  const resetAt = Number(response.headers.get("x-ratelimit-reset")) * 1000;

  return limited && Number.isFinite(resetAt) ? resetAt : null;
}

/** GETs `url` within `timeoutMs` and parses its JSON body. */
async function getJson(
  fetchFn: FetchLike,
  timeoutMs: number,
  url: string,
  headers: Record<string, string> = {},
): Promise<Loaded> {
  try {
    const response = await fetchFn(url, { method: "GET", headers, signal: AbortSignal.timeout(timeoutMs) });

    return response.ok
      ? { value: await response.json(), retryAt: null }
      : { value: null, retryAt: rateLimitReset(response) };
  } catch {
    return { value: null, retryAt: null };
  }
}

/** One upstream part behind a single-flight cache. */
interface CachedPart {
  /** Starts a refresh when the last began `ttlMs` ago, waits for one in flight, and returns the last good answer. */
  read(): Promise<PartReading | null>;
}

/**
 * Caches what `load` answers. A failed load keeps the last good answer, and one carrying `retryAt` also holds off
 * the next load until then.
 */
function cachedPart(now: () => Date, ttlMs: number, load: () => Promise<Loaded>): CachedPart {
  let last: PartReading | null = null;
  let nextRefreshAt = Number.NEGATIVE_INFINITY;
  let inFlight: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    const { value, retryAt } = await load();

    if (value !== null) {
      last = { value, fetchedAt: now() };
    }

    if (retryAt !== null) {
      nextRefreshAt = Math.max(nextRefreshAt, retryAt);
    }
  }

  return {
    async read() {
      if (inFlight === null && now().getTime() >= nextRefreshAt) {
        nextRefreshAt = now().getTime() + ttlMs;

        inFlight = refresh().finally(() => {
          inFlight = null;
        });
      }

      await inFlight;

      return last;
    },
  };
}

export function createHiveUpstream(options: HiveUpstreamOptions): HiveUpstream {
  const { config, now, timeoutMs } = options;

  function load(url: string, headers: Readonly<Record<string, string>> = {}): () => Promise<Loaded> {
    return () => getJson(options.fetch, timeoutMs, url, headers);
  }

  /** The pull pages concatenated, following `needsNextPage`; a failed page fails the whole list. */
  async function loadPulls(): Promise<Loaded> {
    const pulls: unknown[] = [];

    for (let page = 1; page <= MAX_GITHUB_PAGES; page += 1) {
      const url = page === 1 ? GITHUB_PULLS_URL : `${GITHUB_PULLS_URL}&page=${page}`;
      const answer = await getJson(options.fetch, timeoutMs, url, GITHUB_HEADERS);

      if (!Array.isArray(answer.value)) {
        return { value: null, retryAt: answer.retryAt };
      }

      const pagePulls = answer.value as unknown[];

      pulls.push(...pagePulls);

      if (!needsNextPage(pagePulls, now())) {
        break;
      }
    }

    return { value: pulls, retryAt: null };
  }

  const parts: Partial<Record<PartName, CachedPart>> = { pulls: cachedPart(now, SLOW_TTL_MS, loadPulls) };

  if (config.baseUrl !== null) {
    parts.health = cachedPart(now, FAST_TTL_MS, load(`${config.baseUrl}/api/health`));
    parts.contributeMetrics = cachedPart(now, SLOW_TTL_MS, load(`${config.baseUrl}/api/contribute/metrics`));
    parts.runStats = cachedPart(now, SLOW_TTL_MS, load(`${config.baseUrl}/api/contribute/run-stats`));

    if (config.widgetToken !== null) {
      const headers = { "X-Hive-Widget-Token": config.widgetToken };

      parts.widget = cachedPart(now, FAST_TTL_MS, load(`${config.baseUrl}/api/widget/summary`, headers));
    }
  }

  return {
    async read() {
      const readings = await Promise.all(
        Object.entries(parts).map(async ([name, part]) => [name, await part.read()] as const),
      );

      return Object.fromEntries(readings);
    },
  };
}
