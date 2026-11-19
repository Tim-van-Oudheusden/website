import type { GovernorMode, HivePublicMetrics } from "shared";

import type { ContributorHour } from "./contributor-history";
import { windowStart } from "./repo-pr-activity";

/** Raw upstream payloads; `null` when that Hive call failed or is not configured. */
export interface HiveUpstreamPayloads {
  health: unknown;
  widget: unknown;
  contributeMetrics: unknown;
  runStats: unknown;
  /** Contributor hours stored from earlier answers, in any order; Hive's own series wins where they overlap. */
  storedHours: readonly ContributorHour[];
}

type HivePart = HivePublicMetrics["hive"];

/** One usable widget history point, with `t` still in epoch milliseconds. */
interface HistoryPoint {
  t: number;
  mode: GovernorMode;
  issues: number;
  prs: number;
  held: number;
  actionable: number;
  mergeable: number;
}

type ContributorsPart = HivePublicMetrics["contributors"];

type RunsPart = NonNullable<ContributorsPart>["runs"];

type ContributorDay = NonNullable<ContributorsPart>["days"][number];

const HOUR_MS = 3_600_000;

const DAY_MS = 86_400_000;

/** Hive's governor modes (hive `src/pkg/governor/governor.go`), keyed by the upper-case wire value. */
const GOVERNOR_MODES: Readonly<Record<string, GovernorMode>> = {
  IDLE: "idle",
  QUIET: "quiet",
  BUSY: "busy",
  SURGE: "surge",
};

/** Largest epoch-millisecond value a `Date` can hold. */
const MAX_DATE_MS = 8.64e15;

/** Reads `key` from an upstream object; anything else reads as absent. */
function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>)[key] : undefined;
}

/** A count: a non-negative safe integer, else null. */
function count(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

/** A widget history point, or null when any kept field is missing, malformed or an unknown mode. */
function historyPoint(raw: unknown): HistoryPoint | null {
  const t = count(field(raw, "t"));
  const govMode = field(raw, "govMode");
  const mode = typeof govMode === "string" && Object.hasOwn(GOVERNOR_MODES, govMode)
    ? (GOVERNOR_MODES[govMode] ?? null)
    : null;
  const issues = count(field(raw, "govIssues"));
  const prs = count(field(raw, "govPrs"));
  const held = count(field(raw, "govHold"));
  const actionable = count(field(raw, "actionableCount"));
  const mergeable = count(field(raw, "mergeableCount"));

  if (
    t === null
    || t > MAX_DATE_MS
    || mode === null
    || issues === null
    || prs === null
    || held === null
    || actionable === null
    || mergeable === null
  ) {
    return null;
  }

  return { t, mode, issues, prs, held, actionable, mergeable };
}

/**
 * The `hive` part from `/api/widget/summary`. Unusable history points are skipped; without agents or a single
 * usable point the whole part is null.
 */
function buildHive(widget: unknown): HivePart {
  const agents = field(widget, "agents");
  const history = field(widget, "history");

  if (!Array.isArray(agents) || !Array.isArray(history)) {
    return null;
  }

  const points = history
    .map(historyPoint)
    .filter((point) => point !== null)
    .sort((a, b) => a.t - b.t);
  const latest = points.at(-1);

  if (latest === undefined) {
    return null;
  }

  return {
    mode: latest.mode,
    agents: {
      total: agents.length,
      // Hive's agent states: idle, running, stopped, failed, paused (hive `src/crux/process_types.go`).
      running: agents.filter((agent) => field(agent, "state") === "running").length,
    },
    work: {
      issues: latest.issues,
      prs: latest.prs,
      held: latest.held,
      actionable: latest.actionable,
      mergeable: latest.mergeable,
    },
    history: points.map((point) => ({
      t: new Date(point.t).toISOString(),
      mode: point.mode,
      issues: point.issues,
      prs: point.prs,
      held: point.held,
    })),
  };
}

/** A series of counts, or null when it is not an array of counts. */
function counts(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const series = value.map(count);

  return series.every((entry) => entry !== null) ? series : null;
}

/** A duration in seconds: a finite non-negative number, else null. */
function seconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** One run-stats backend, or null when its name or a run count is malformed. */
function backendRuns(raw: unknown): RunsPart["backends"][number] | null {
  const backend = field(raw, "backend");
  const completed = count(field(raw, "completed"));
  const failed = count(field(raw, "failed"));
  const abandoned = count(field(raw, "abandoned"));

  if (typeof backend !== "string" || backend === "" || completed === null || failed === null || abandoned === null) {
    return null;
  }

  // Percentiles are per backend; they cannot be combined across backends.
  return {
    backend,
    completed,
    failed,
    abandoned,
    p50Seconds: seconds(field(raw, "duration_p50_s")),
    p95Seconds: seconds(field(raw, "duration_p95_s")),
  };
}

/** `runs` from `/api/contribute/run-stats`; null without a usable total. Malformed backends are skipped. */
function buildRuns(runStats: unknown): RunsPart | null {
  const total = count(field(runStats, "total"));
  const backends = field(runStats, "backends");

  if (total === null) {
    return null;
  }

  return {
    total,
    backends: Array.isArray(backends) ? backends.map(backendRuns).filter((entry) => entry !== null) : [],
  };
}

/** The epoch ms of `collected_at`, else NaN. */
function collectedAt(contributeMetrics: unknown): number {
  const collected = field(contributeMetrics, "collected_at");

  return typeof collected === "string" ? Date.parse(collected) : Number.NaN;
}

/**
 * Hive's hourly contributor series as hours, the last one the hour of `collected_at`; null unless `collected_at` is a
 * date and both series are counts of one length.
 */
export function contributorHours(contributeMetrics: unknown): ContributorHour[] | null {
  const collectedMs = collectedAt(contributeMetrics);
  const tasks = counts(field(contributeMetrics, "tasks_done"));
  const fleet = counts(field(contributeMetrics, "fleet_size"));

  if (!Number.isFinite(collectedMs) || tasks === null || fleet?.length !== tasks.length) {
    return null;
  }

  const lastHour = Math.floor(collectedMs / HOUR_MS) * HOUR_MS;

  return tasks.map((count, index) => ({
    hour: new Date(lastHour - (tasks.length - 1 - index) * HOUR_MS).toISOString(),
    tasks: count,
    fleet: fleet[index] ?? 0,
  }));
}

/** `hours` per UTC day up to `collectedMs`'s day, as the contract's `contributors.days` describes. */
function contributorDays(hours: readonly ContributorHour[], collectedMs: number): ContributorDay[] {
  if (hours.length === 0) {
    return [];
  }

  const today = Math.floor(collectedMs / DAY_MS) * DAY_MS;
  // The oldest stored day is partial unless its midnight hour is stored; today is shown even when partial.
  const firstWholeDay = Math.ceil(Math.min(...hours.map(({ hour }) => Date.parse(hour))) / DAY_MS) * DAY_MS;
  const first = Math.max(windowStart(new Date(collectedMs)), Math.min(firstWholeDay, today));
  const days = Array.from({ length: (today - first) / DAY_MS + 1 }, (_, index) => ({
    t: new Date(first + index * DAY_MS).toISOString(),
    tasks: 0,
    fleet: 0,
  }));

  for (const { hour, tasks, fleet } of hours) {
    const day = days[Math.floor((Date.parse(hour) - first) / DAY_MS)];

    if (day !== undefined) {
      day.tasks += tasks;
      day.fleet = Math.max(day.fleet, fleet);
    }
  }

  return days;
}

/**
 * The `contributors` part from `/api/contribute/metrics`, `/api/contribute/run-stats` and the stored hours; null when
 * either endpoint is unusable. A malformed hourly series adds no hours and leaves `fleet` at 0.
 */
function buildContributors(
  contributeMetrics: unknown,
  runStats: unknown,
  storedHours: readonly ContributorHour[],
): ContributorsPart {
  const collectedMs = collectedAt(contributeMetrics);
  const runs = buildRuns(runStats);

  if (!Number.isFinite(collectedMs) || runs === null) {
    return null;
  }

  const current = contributorHours(contributeMetrics) ?? [];
  const hours = new Map([...storedHours, ...current].map((hour) => [hour.hour, hour]));

  return {
    collectedAt: new Date(collectedMs).toISOString(),
    tasksPerHour: current.map(({ tasks }) => tasks),
    fleetSize: current.map(({ fleet }) => fleet),
    fleet: current.at(-1)?.fleet ?? 0,
    days: contributorDays([...hours.values()], collectedMs),
    runs,
  };
}

/**
 * Builds the public Hive metrics by picking allowlisted fields into fresh objects. Malformed upstream values blank
 * only their own field or part; it never throws.
 */
export function buildHivePublicMetrics(
  upstream: HiveUpstreamPayloads,
): Pick<HivePublicMetrics, "online" | "hive" | "contributors"> {
  return {
    online: field(upstream.health, "status") === "ok",
    hive: buildHive(upstream.widget),
    contributors: buildContributors(upstream.contributeMetrics, upstream.runStats, upstream.storedHours),
  };
}
