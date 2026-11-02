import type { GovernorMode, HiveMetricsResponse, HivePublicMetrics } from "shared";

import type { PollingApiGetState } from "@/shared/hooks/use-polling-api-get";

import {
  formatAgo,
  formatClock,
  formatDay,
  formatDuration,
  formatHour,
  formatHours,
  formatSpan,
  formatUtcDay,
  hourOfDay,
} from "./hive-metrics-format";

const HOUR_MS = 3_600_000;

/** Governor modes, coolest first: the governor rises with the size of the queue. */
export const GOVERNOR_MODES: readonly GovernorMode[] = ["idle", "quiet", "busy", "surge"];

/**
 * What a design can say about its numbers: "Live · updated 40 s ago", "Stale · last update 14:05" or "Offline".
 * `at` is when the back-end last got a good upstream answer, for a `<time>` element; `detail` is null when there is
 * no time to give.
 */
export interface HiveStatusView {
  kind: "connecting" | "live" | "stale" | "offline";
  label: string;
  detail: string | null;
  at: string | null;
}

/** One governor evaluation, about every 5 minutes; `label` is its clock time. */
export interface QueuePoint {
  t: string;
  label: string;
  mode: GovernorMode;
  issues: number;
  prs: number;
  held: number;
}

/** The widget part: agents, the work queue now, and the queue's history. */
export interface HiveWidgetView {
  /** Mode of the latest evaluation. */
  mode: GovernorMode;
  agents: { running: number; total: number };
  /** `open` is issues plus PRs; held work waits on something and is not open work. */
  work: { open: number; issues: number; prs: number; held: number; actionable: number; mergeable: number };
  history: QueuePoint[];
  /** "last 33 hours": the span the history covers, or null when it is under a minute. */
  span: string | null;
  /** Each mode's share of the history's evaluations, coolest first; every mode is listed. */
  modeShare: { mode: GovernorMode; points: number; share: number }[];
}

/** One backend's runs over the last 7 days; `p50`/`p95` are its own run-time percentiles ("5 min"), or null. */
export interface BackendRunsView {
  name: string;
  runs: number;
  completed: number;
  failed: number;
  abandoned: number;
  /** Completed share of its runs; null without runs. */
  successRate: number | null;
  p50: string | null;
  p95: string | null;
}

/** The contributor agents connected to this hive: tasks per hour and runs over the last 7 days. */
export interface ContributorsView {
  tasksTotal: number;
  /** Contributor agents connected in the latest hour. */
  fleet: number;
  /** Hourly buckets, oldest first; `label` is "Mon 13:00". */
  hours: { t: string; label: string; tasks: number; fleet: number }[];
  /** The busiest hour, the earliest on a tie; null when no task was done. */
  peak: { label: string; tasks: number } | null;
  /** The same buckets by day (`days`, oldest first) and hour of day, for a day × hour grid. */
  heatmap: { days: string[]; cells: { day: number; hour: number; tasks: number }[] };
  /**
   * `total` is Hive's own count; `outcomes` adds up the backends' counts. Percentiles stay per backend: they are never
   * added up or averaged across backends.
   */
  runs: {
    total: number;
    outcomes: { completed: number; failed: number; abandoned: number };
    backends: BackendRunsView[];
  };
}

/** Who wrote a merged PR (docs/metrics/README.md, "How PRs are attributed"). */
export type MergedSource = "hive" | "claudeCode" | "dependabot" | "other";

/** Authors in the order a design lists them, Hive first. */
export const MERGED_SOURCES: readonly { key: MergedSource; name: string }[] = [
  { key: "hive", name: "Hive" },
  { key: "claudeCode", name: "Claude Code" },
  { key: "dependabot", name: "Dependabot" },
  { key: "other", name: "other" },
];

/** This repo's public pull requests over the last 7 UTC days; `label` is "Mon 27 Oct". */
export interface RepoView {
  days: { t: string; label: string; opened: number; merged: number; closedUnmerged: number }[];
  totals: { opened: number; merged: number; closedUnmerged: number };
  mergedBySource: ({ t: string; label: string } & Record<MergedSource, number>)[];
  /** PRs merged in the window, by author. */
  merged: number;
  /** Each author's merged PRs and share of `merged` (0 when nothing merged), in `MERGED_SOURCES` order. */
  sources: { key: MergedSource; name: string; merged: number; share: number }[];
  /** Created → merged, "30 min" or "14 h"; null before any merge. */
  timeToMerge: { median: string | null; p90: string | null };
}

/** Everything a design shows, derived from one poll of `GET /api/hive/metrics`. */
export interface HiveViewModel {
  status: HiveStatusView;
  /** One line to show instead of every part, while the first poll loads or when no part is available; else null. */
  fallback: string | null;
  /** Each part is null when its upstream is missing; a design says so in one line and keeps the other parts. */
  hive: HiveWidgetView | null;
  contributors: ContributorsView | null;
  repo: RepoView | null;
}

type MetricsPoll = PollingApiGetState<HiveMetricsResponse>;

export const LOADING_TEXT = "Loading the live numbers…";
export const UNAVAILABLE_TEXT = "The live numbers are not available right now: this site cannot reach Hive or GitHub. "
  + "They fill in on their own once it can.";

function resolveStatus(poll: MetricsPoll, now: number, timeZone: string | null): HiveStatusView {
  const response = poll.data;

  if (response === null) {
    return poll.status === "error"
      ? { kind: "offline", label: "Offline", detail: null, at: null }
      : { kind: "connecting", label: "Connecting", detail: null, at: null };
  }

  if (response.state === "unavailable" || response.metrics?.online !== true) {
    return { kind: "offline", label: "Offline", detail: null, at: null };
  }

  const at = response.fetchedAt;

  if (response.state === "live" && !poll.stale && at !== null) {
    return { kind: "live", label: "Live", detail: `updated ${formatAgo(at, now)}`, at };
  }

  return { kind: "stale", label: "Stale", detail: at === null ? null : `last update ${formatClock(at, timeZone)}`, at };
}

function buildHive(hive: NonNullable<HivePublicMetrics["hive"]>, timeZone: string | null): HiveWidgetView {
  const { work } = hive;
  // The live widget sends every evaluation twice; one timestamp is one evaluation.
  const history = hive.history.filter((point, index, all) => all[index - 1]?.t !== point.t);
  const first = history.at(0);
  const last = history.at(-1);

  return {
    mode: hive.mode,
    agents: { running: hive.agents.running, total: hive.agents.total },
    work: { open: work.issues + work.prs, ...work },
    history: history.map((point) => ({ ...point, label: formatClock(point.t, timeZone) })),
    span: first === undefined || last === undefined ? null : formatSpan(first.t, last.t),
    modeShare: GOVERNOR_MODES.map((mode) => {
      const points = history.filter((point) => point.mode === mode).length;

      return { mode, points, share: history.length === 0 ? 0 : points / history.length };
    }),
  };
}

/** Hourly buckets by the day they fall on and their hour of day, so a design can lay them out as a day × hour grid. */
function buildHeatmap(buckets: readonly { epochMs: number; tasks: number }[], timeZone: string | null): ContributorsView["heatmap"] {
  const days: string[] = [];
  const cells = buckets.map(({ epochMs, tasks }) => {
    const day = formatDay(epochMs, timeZone);

    if (days.at(-1) !== day) {
      days.push(day);
    }

    return { day: days.length - 1, hour: hourOfDay(epochMs, timeZone), tasks };
  });

  return { days, cells };
}

function buildContributors(contributors: NonNullable<HivePublicMetrics["contributors"]>, timeZone: string | null): ContributorsView {
  const { tasksPerHour, fleetSize, runs7d } = contributors;
  // The last bucket is the hour Hive collected the series in; the ones before it step back an hour each.
  const collected = Date.parse(contributors.collectedAt);
  const buckets = tasksPerHour.map((tasks, index) => ({
    epochMs: collected - ((tasksPerHour.length - 1 - index) * HOUR_MS),
    tasks,
  }));
  const hours = buckets.map(({ epochMs, tasks }, index) => ({
    t: new Date(epochMs).toISOString(),
    label: formatHour(epochMs, timeZone),
    tasks,
    fleet: fleetSize[index] ?? 0,
  }));
  const peak = hours.reduce<ContributorsView["peak"]>(
    (best, hour) => (hour.tasks > (best?.tasks ?? 0) ? { label: hour.label, tasks: hour.tasks } : best),
    null,
  );
  const backends = runs7d.backends.map((backend): BackendRunsView => {
    const runs = backend.completed + backend.failed + backend.abandoned;

    return {
      name: backend.backend,
      runs,
      completed: backend.completed,
      failed: backend.failed,
      abandoned: backend.abandoned,
      successRate: runs === 0 ? null : backend.completed / runs,
      p50: backend.p50Seconds === null ? null : formatDuration(backend.p50Seconds),
      p95: backend.p95Seconds === null ? null : formatDuration(backend.p95Seconds),
    };
  });

  return {
    tasksTotal: tasksPerHour.reduce((sum, tasks) => sum + tasks, 0),
    fleet: fleetSize.at(-1) ?? 0,
    hours,
    peak,
    heatmap: buildHeatmap(buckets, timeZone),
    runs: {
      total: runs7d.total,
      outcomes: {
        completed: backends.reduce((sum, backend) => sum + backend.completed, 0),
        failed: backends.reduce((sum, backend) => sum + backend.failed, 0),
        abandoned: backends.reduce((sum, backend) => sum + backend.abandoned, 0),
      },
      backends,
    },
  };
}

function buildRepo(repo: NonNullable<HivePublicMetrics["repo"]>): RepoView {
  const days = repo.days.map((day) => ({ ...day, label: formatUtcDay(day.t) }));

  function total(pick: (day: RepoView["days"][number]) => number): number {
    return days.reduce((sum, day) => sum + pick(day), 0);
  }

  const mergedBySource = repo.mergedBySource.map((day) => ({ ...day, label: formatUtcDay(day.t) }));
  const bySource = MERGED_SOURCES.map(({ key, name }) => ({
    key,
    name,
    merged: mergedBySource.reduce((sum, day) => sum + day[key], 0),
  }));
  const merged = bySource.reduce((sum, source) => sum + source.merged, 0);

  return {
    days,
    totals: {
      opened: total((day) => day.opened),
      merged: total((day) => day.merged),
      closedUnmerged: total((day) => day.closedUnmerged),
    },
    mergedBySource,
    merged,
    sources: bySource.map((source) => ({ ...source, share: merged === 0 ? 0 : source.merged / merged })),
    timeToMerge: {
      median: repo.medianHoursToMerge === null ? null : formatHours(repo.medianHoursToMerge),
      p90: repo.p90HoursToMerge === null ? null : formatHours(repo.p90HoursToMerge),
    },
  };
}

/**
 * The view model for one poll; `now` (epoch ms) dates the relative times, `timeZone` (IANA, or null for the visitor's
 * own) the clock times.
 */
export function buildHiveViewModel(poll: MetricsPoll, now: number, timeZone: string | null): HiveViewModel {
  const metrics = poll.data?.state === "unavailable" ? null : poll.data?.metrics ?? null;
  const parts = metrics ?? { hive: null, contributors: null, repo: null };
  const hive = parts.hive === null ? null : buildHive(parts.hive, timeZone);
  const contributors = parts.contributors === null ? null : buildContributors(parts.contributors, timeZone);
  const repo = parts.repo === null ? null : buildRepo(parts.repo);
  const hasAnyPart = hive !== null || contributors !== null || repo !== null;
  let fallback: string | null = null;

  if (poll.status === "loading") {
    fallback = LOADING_TEXT;
  } else if (!hasAnyPart) {
    fallback = UNAVAILABLE_TEXT;
  }

  return {
    status: resolveStatus(poll, now, timeZone),
    fallback,
    hive: fallback === null ? hive : null,
    contributors: fallback === null ? contributors : null,
    repo: fallback === null ? repo : null,
  };
}
