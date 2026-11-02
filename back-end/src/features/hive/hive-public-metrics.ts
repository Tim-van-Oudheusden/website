import type { GovernorMode, HivePublicMetrics } from "shared";

/** Raw upstream payloads; `null` when that Hive call failed or is not configured. */
export interface HiveUpstream {
  health: unknown;
  widget: unknown;
  contributeMetrics: unknown;
  runStats: unknown;
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

type RunsPart = NonNullable<ContributorsPart>["runs7d"];

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

/** `runs7d` from `/api/contribute/run-stats`; null without a usable total. Malformed backends are skipped. */
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

/**
 * The `contributors` part from `/api/contribute/metrics` and `/api/contribute/run-stats`; null when either is
 * unusable. The hourly series are kept only while both are valid and aligned, else both are empty.
 */
function buildContributors(contributeMetrics: unknown, runStats: unknown): ContributorsPart {
  const collected = field(contributeMetrics, "collected_at");
  const collectedMs = typeof collected === "string" ? Date.parse(collected) : Number.NaN;
  const runs7d = buildRuns(runStats);

  if (!Number.isFinite(collectedMs) || runs7d === null) {
    return null;
  }

  const tasksPerHour = counts(field(contributeMetrics, "tasks_done"));
  const fleetSize = counts(field(contributeMetrics, "fleet_size"));
  const aligned = tasksPerHour !== null && fleetSize !== null && tasksPerHour.length === fleetSize.length;

  return {
    collectedAt: new Date(collectedMs).toISOString(),
    tasksPerHour: aligned ? tasksPerHour : [],
    fleetSize: aligned ? fleetSize : [],
    runs7d,
  };
}

/**
 * Builds the public Hive metrics by picking allowlisted fields into fresh objects. Malformed upstream values blank
 * only their own field or part; it never throws.
 */
export function buildHivePublicMetrics(
  upstream: HiveUpstream,
): Pick<HivePublicMetrics, "online" | "hive" | "contributors"> {
  return {
    online: field(upstream.health, "status") === "ok",
    hive: buildHive(upstream.widget),
    contributors: buildContributors(upstream.contributeMetrics, upstream.runStats),
  };
}
