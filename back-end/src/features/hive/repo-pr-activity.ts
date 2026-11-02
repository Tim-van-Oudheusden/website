import type { HivePublicMetrics } from "shared";
import type { Attribution } from "shared/pr-source";
import { attribute } from "shared/pr-source";

type RepoPart = HivePublicMetrics["repo"];

type SourceCounts = NonNullable<RepoPart>["mergedBySource"][number];

/** The fields kept from one GitHub pull, timestamps in epoch milliseconds. */
interface Pull {
  created: number;
  merged: number | null;
  closed: number | null;
  source: Attribution["source"];
}

/** `mergedBySource` key for each attribution source. */
const SOURCE_KEYS: Readonly<Record<Attribution["source"], Exclude<keyof SourceCounts, "t">>> = {
  "Hive": "hive",
  "Claude Code (CI)": "claudeCode",
  "Dependabot": "dependabot",
  "Other": "other",
};

const DAY_MS = 86_400_000;

/** Days in the window; the last one is `now`'s UTC day. */
const WINDOW_DAYS = 7;

/** Start of the oldest window day: midnight UTC six days before `now`'s UTC day. */
function windowStart(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (WINDOW_DAYS - 1) * DAY_MS;
}

/** Reads `key` from an upstream object; anything else reads as absent. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

/** A GitHub timestamp in epoch milliseconds, else NaN. */
function timestamp(value: unknown): number {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

/** Nearest-rank percentile `p` (0–100] of ascending `sorted`: the value at rank ⌈p/100 × n⌉; null when empty. */
function nearestRank(sorted: readonly number[], p: number): number | null {
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] ?? null;
}

/** A GitHub timestamp that is null (not merged or closed yet); undefined when malformed. */
function optionalTimestamp(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }

  const ms = timestamp(value);

  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * The kept fields of one pull, or null when any is missing or malformed. The branch and body are read only to
 * attribute it, and are not kept.
 */
function pull(raw: unknown): Pull | null {
  const created = timestamp(field(raw, "created_at"));
  const merged = optionalTimestamp(field(raw, "merged_at"));
  const closed = optionalTimestamp(field(raw, "closed_at"));
  const headRefName = field(field(raw, "head"), "ref");
  const body = field(raw, "body");

  if (
    Number.isNaN(created)
    || merged === undefined
    || closed === undefined
    || typeof headRefName !== "string"
    || (typeof body !== "string" && body !== null)
  ) {
    return null;
  }

  return { created, merged, closed, source: attribute({ headRefName, body: body ?? "" }).source };
}

/**
 * The `repo` part from GitHub's pull list (`GET /repos/{owner}/{repo}/pulls?state=all&sort=updated`, pages
 * concatenated). Only timestamps and counts leave this function; titles, bodies, branches and logins never do.
 * Unusable entries are skipped; null when the answer is not a list, or a non-empty list without one usable entry.
 */
export function buildRepoPrActivity(pulls: unknown, now: Date): RepoPart {
  const usable = Array.isArray(pulls) ? pulls.map(pull).filter((entry) => entry !== null) : [];

  if (!Array.isArray(pulls) || (pulls.length > 0 && usable.length === 0)) {
    return null;
  }

  const start = windowStart(now);
  const dayStarts = Array.from({ length: WINDOW_DAYS }, (_, index) => new Date(start + index * DAY_MS).toISOString());
  const days = dayStarts.map((t) => ({ t, opened: 0, merged: 0, closedUnmerged: 0 }));
  const mergedBySource = dayStarts.map((t) => ({ t, hive: 0, claudeCode: 0, dependabot: 0, other: 0 }));

  /** Index of the window day an event falls on; outside the window it indexes nothing. */
  function dayIndex(ms: number): number {
    return Math.floor((ms - start) / DAY_MS);
  }

  const hoursToMerge: number[] = [];

  for (const { created, merged, closed, source } of usable) {
    const openedDay = days[dayIndex(created)];

    if (openedDay !== undefined) {
      openedDay.opened += 1;
    }

    if (merged !== null) {
      const index = dayIndex(merged);
      const mergedDay = days[index];
      const sourceDay = mergedBySource[index];

      if (mergedDay !== undefined && sourceDay !== undefined) {
        mergedDay.merged += 1;
        sourceDay[SOURCE_KEYS[source]] += 1;
        hoursToMerge.push((merged - created) / 3_600_000);
      }
    } else if (closed !== null) {
      const closedDay = days[dayIndex(closed)];

      if (closedDay !== undefined) {
        closedDay.closedUnmerged += 1;
      }
    }
  }

  hoursToMerge.sort((a, b) => a - b);

  return {
    from: new Date(start).toISOString(),
    to: now.toISOString(),
    days,
    mergedBySource,
    medianHoursToMerge: nearestRank(hoursToMerge, 50),
    p90HoursToMerge: nearestRank(hoursToMerge, 90),
  };
}

/** GitHub's `per_page`; a shorter page is the last one. */
const PAGE_SIZE = 100;

/**
 * Whether to fetch the page after `pulls` (one page, sorted by `updated_at` descending): only when the page is full
 * and its oldest `updated_at` is still inside the window, since a PR with events in the window was updated in it.
 */
export function needsNextPage(pulls: unknown, now: Date): boolean {
  if (!Array.isArray(pulls) || pulls.length !== PAGE_SIZE) {
    return false;
  }

  const oldest = Math.min(...pulls.map((raw) => timestamp(field(raw, "updated_at"))));

  return oldest >= windowStart(now);
}
