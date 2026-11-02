/**
 * The Agentic page's view model: everything a design shows, derived from one polled `GET /api/hive/metrics` response.
 * Pure, so every design draws the same words and numbers; designs differ only in markup classes and CSS.
 */

import type { GovernorMode, HiveMetricsResponse, HivePublicMetrics } from "shared";

import type { PollingApiGetState } from "@/shared/hooks/use-polling-api-get";

import {
  formatAgo,
  formatClock,
  formatDateTime,
  formatDuration,
  formatHour,
  formatHours,
  formatSpan,
  formatUtcDay,
  formatValue,
} from "./hive-metrics-format";

type HiveWidget = NonNullable<HivePublicMetrics["hive"]>;
type Contributors = NonNullable<HivePublicMetrics["contributors"]>;
type RepoActivity = NonNullable<HivePublicMetrics["repo"]>;

const HOUR_MS = 3_600_000;

const METRICS_README_URL = "https://github.com/Tim-van-Oudheusden/website/blob/main/docs/metrics/README.md";

/** Governor modes, coolest to warmest: the mode chart's levels from the bottom up. */
const GOVERNOR_MODES: readonly GovernorMode[] = ["idle", "quiet", "busy", "surge"];

/** What the page can say about its numbers, with the time behind "updated 40 s ago" or "last update 14:05". */
export interface HiveStatusView {
  kind: "connecting" | "live" | "stale" | "offline";
  label: string;
  detail: { prefix: string; at: string; text: string; title: string } | null;
}

/** One "Show data" row; `key` is unique within the table. */
export interface ChartTableRow {
  key: string;
  /** One cell per header column; the first names the row. */
  cells: readonly string[];
}

/** The data table every chart carries: a header row of unique column names, then the rows. */
export interface ChartTable {
  header: readonly string[];
  rows: readonly ChartTableRow[];
}

/**
 * `line`: lines over time. `steps`: one stepped line over `levels`. `bars`: grouped bars (a `line` series overlays).
 * `stacked-bars`: bars stacked per category. `stacked-rows`: horizontal bars stacked per category.
 */
export type ChartKind = "line" | "steps" | "bars" | "stacked-bars" | "stacked-rows";

/** One named series of non-negative values, one per category. */
export interface ChartSeriesView {
  name: string;
  values: readonly number[];
  shape: "bar" | "line";
}

export interface HiveChartView {
  kind: ChartKind;
  caption: string;
  /** The chart's accessible name: the caption and the takeaway, computed from the data. */
  summary: string;
  /** Category labels, oldest first (rows top to bottom for `stacked-rows`). */
  categories: readonly string[];
  series: readonly ChartSeriesView[];
  /** The named levels of a `steps` chart, lowest first; empty for every other kind. */
  levels: readonly string[];
  table: ChartTable;
}

/** A run of note text: plain, inline code, or a link. */
export type NoteSegment
  = | { kind: "text"; text: string }
    | { kind: "code"; text: string }
    | { kind: "link"; text: string; href: string };

export interface PanelView {
  id: "queue" | "mode" | "contributors" | "runs" | "pull-requests" | "merged-by";
  title: string;
  /** The panel's headline sentence, or `null` for none. */
  lead: string | null;
  /** Labelled figures beside the chart. */
  stats: readonly { label: string; value: string }[];
  chart: HiveChartView | null;
  /** Small print under the chart, one paragraph per entry. */
  notes: readonly (readonly NoteSegment[])[];
}

export interface KpiView {
  id: "agents" | "open-work" | "mergeable" | "mode";
  label: string;
  value: string;
  detail: string;
}

/** The board in reading order: the headline numbers, then the panels, with one line standing in for a missing part. */
export type BoardItem
  = | { kind: "kpis"; kpis: readonly KpiView[] }
    | { kind: "panel"; panel: PanelView }
    | { kind: "missing"; part: "hive" | "contributors" | "repo"; text: string };

export interface HiveView {
  status: HiveStatusView;
  /** The one paragraph shown instead of an empty board, or `null` when the board has something to show. */
  fallback: string | null;
  board: readonly BoardItem[];
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function plural(count: number, one: string, many: string): string {
  return `${formatValue(count)} ${count === 1 ? one : many}`;
}

/** A run-time percentile, which a backend may not report. */
function percentile(seconds: number | null): string {
  return seconds === null ? "not reported" : formatDuration(seconds);
}

/** A time to merge, which a week without merges does not have. */
function mergeTime(hours: number | null): string {
  return hours === null ? "no merges yet" : formatHours(hours);
}

function panelItem(panel: PanelView): BoardItem {
  return { kind: "panel", panel };
}

/** The table every series chart shares: one row per category, one column per series. */
function seriesTable(header: string, categories: readonly string[], series: readonly ChartSeriesView[]): ChartTable {
  return {
    header: [header, ...series.map((entry) => entry.name)],
    rows: categories.map((label, index) => ({
      key: String(index),
      cells: [label, ...series.map((entry) => formatValue(entry.values[index] ?? 0))],
    })),
  };
}

function describeLine({ name, values }: ChartSeriesView): string {
  const latest = formatValue(values.at(-1) ?? 0);

  if (values.length === 1) {
    return `${name} now ${latest}`;
  }

  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  return lowest === highest
    ? `${name} steady at ${latest}`
    : `${name} between ${formatValue(lowest)} and ${formatValue(highest)}, now ${latest}`;
}

function describeTotals(series: readonly ChartSeriesView[], categories: readonly string[]): string {
  return series
    .map(({ name, values }) => {
      const total = sum(values);

      if (total === 0) {
        return `${name} none`;
      }

      const peak = Math.max(...values);

      return `${name} ${formatValue(total)} in total, most ${formatValue(peak)} (${categories[values.indexOf(peak)] ?? ""})`;
    })
    .join("; ");
}

function describeShares(series: readonly ChartSeriesView[]): string {
  const whole = formatValue(sum(series.map((entry) => sum(entry.values))));

  return series.map(({ name, values }) => `${name} ${formatValue(sum(values))} of ${whole}`).join("; ");
}

function describeModes(history: HiveWidget["history"], timeZone: string | null): string {
  // Each segment starts where the mode changes.
  const starts = history.filter((point, index) => index === 0 || history[index - 1]?.mode !== point.mode);
  const first = starts.at(0);
  const latest = starts.at(-1);

  if (first === undefined || latest === undefined) {
    return "no data yet";
  }

  const changes = starts.length - 1;
  const current = `${latest.mode} since ${formatClock(latest.t, timeZone)}`;

  if (changes === 0) {
    return `${current}, no mode changes`;
  }

  return `${current}; ${plural(changes, "mode change", "mode changes")} since ${formatClock(first.t, timeZone)}`;
}

function resolveStatus(
  poll: PollingApiGetState<HiveMetricsResponse>,
  now: number,
  timeZone: string | null,
): HiveStatusView {
  const response = poll.data;

  if (response === null) {
    return poll.status === "error"
      ? { kind: "offline", label: "Offline", detail: null }
      : { kind: "connecting", label: "Connecting", detail: null };
  }

  if (response.state === "unavailable" || response.metrics?.online !== true) {
    return { kind: "offline", label: "Offline", detail: null };
  }

  const at = response.fetchedAt;

  if (response.state === "live" && !poll.stale && at !== null) {
    return {
      kind: "live",
      label: "Live",
      detail: { prefix: "updated", at, text: formatAgo(at, now), title: formatDateTime(at, timeZone) },
    };
  }

  return {
    kind: "stale",
    label: "Stale",
    detail: at === null
      ? null
      : { prefix: "last update", at, text: formatClock(at, timeZone), title: formatDateTime(at, timeZone) },
  };
}

function hiveKpis({ agents, work, mode }: HiveWidget): BoardItem {
  return {
    kind: "kpis",
    kpis: [
      {
        id: "agents",
        label: "Agents running",
        value: `${formatValue(agents.running)} / ${formatValue(agents.total)}`,
        detail: "of the agents configured",
      },
      {
        id: "open-work",
        label: "Open work",
        value: formatValue(work.issues + work.prs),
        detail: `${formatValue(work.issues)} issues · ${formatValue(work.prs)} PRs · ${formatValue(work.held)} held`,
      },
      { id: "mergeable", label: "Ready to merge", value: formatValue(work.mergeable), detail: `${formatValue(work.actionable)} actionable` },
      { id: "mode", label: "Governor mode", value: mode, detail: "how hard Hive is working the queue" },
    ],
  };
}

function queuePanel(hive: HiveWidget, timeZone: string | null): PanelView {
  const { history } = hive;
  const first = history.at(0);
  const last = history.at(-1);
  const span = first === undefined || last === undefined ? null : formatSpan(first.t, last.t);
  const categories = history.map((point) => formatClock(point.t, timeZone));
  const series: ChartSeriesView[] = [
    { name: "issues", values: history.map((point) => point.issues), shape: "line" },
    { name: "PRs", values: history.map((point) => point.prs), shape: "line" },
    { name: "held", values: history.map((point) => point.held), shape: "line" },
  ];
  const caption = "Open issues, open PRs and held work";
  const withData = series.filter((entry) => entry.values.length > 0);

  return {
    id: "queue",
    title: span === null ? "Queue, latest point" : `Queue, ${span}`,
    lead: null,
    stats: [],
    chart: {
      kind: "line",
      caption,
      summary: `${caption}: ${withData.length === 0 ? "no data yet" : withData.map(describeLine).join("; ")}`,
      categories,
      series,
      levels: [],
      table: seriesTable("Time", categories, series),
    },
    notes: [[{ kind: "text", text: "One point per governor evaluation, about every 5 minutes." }]],
  };
}

function modePanel(hive: HiveWidget, timeZone: string | null): PanelView {
  const { history } = hive;
  const caption = "Mode per governor evaluation";
  const categories = history.map((point) => formatClock(point.t, timeZone));

  return {
    id: "mode",
    title: "Governor mode",
    lead: null,
    stats: [],
    chart: {
      kind: "steps",
      caption,
      summary: `${caption}: ${describeModes(history, timeZone)}`,
      categories,
      series: [{ name: "mode", values: history.map((point) => GOVERNOR_MODES.indexOf(point.mode)), shape: "line" }],
      levels: GOVERNOR_MODES,
      table: {
        header: ["Time", "Mode"],
        rows: history.map((point, index) => ({ key: String(index), cells: [categories[index] ?? "", point.mode] })),
      },
    },
    notes: [[{ kind: "text", text: "Rises with the size of the queue: idle, quiet, busy, surge." }]],
  };
}

function contributorsPanel(contributors: Contributors, timeZone: string | null): PanelView {
  const { tasksPerHour, fleetSize, collectedAt } = contributors;
  const fleet = fleetSize.at(-1) ?? 0;
  // The last bucket is the hour Hive collected the series in; the ones before it step back an hour each.
  const categories = tasksPerHour.map((_, index) => formatHour(
    Date.parse(collectedAt) - ((tasksPerHour.length - 1 - index) * HOUR_MS),
    timeZone,
  ));
  const tasks: ChartSeriesView = { name: "tasks", values: tasksPerHour, shape: "bar" };
  const agents: ChartSeriesView = { name: "contributor agents", values: fleetSize, shape: "line" };
  const caption = "Tasks completed per hour, with the contributor agents connected";
  const notes: NoteSegment[][] = [[{ kind: "text", text: "Tasks done by contributor agents connected to this hive." }]];

  if (tasksPerHour.length === 0) {
    notes.unshift([{ kind: "text", text: "No hourly series from Hive yet." }]);
  }

  return {
    id: "contributors",
    title: "Contributor agents, last 7 days",
    lead: `${plural(sum(tasksPerHour), "task", "tasks")} · ${plural(fleet, "contributor agent", "contributor agents")} connected`,
    stats: [],
    chart: tasksPerHour.length === 0
      ? null
      : {
          kind: "bars",
          caption,
          summary: `${caption}: ${describeTotals([tasks], categories)}; ${describeLine(agents)}`,
          categories,
          series: [tasks, agents],
          levels: [],
          table: seriesTable("Hour", categories, [tasks, agents]),
        },
    notes,
  };
}

function runsPanel(contributors: Contributors): PanelView {
  const { backends } = contributors.runs7d;
  const categories = backends.map((backend) => (
    `${backend.backend} · ${plural(backend.completed + backend.failed + backend.abandoned, "run", "runs")}`
  ));
  const series: ChartSeriesView[] = [
    { name: "completed", values: backends.map((backend) => backend.completed), shape: "bar" },
    { name: "failed", values: backends.map((backend) => backend.failed), shape: "bar" },
    { name: "abandoned", values: backends.map((backend) => backend.abandoned), shape: "bar" },
  ];
  const caption = "Run outcomes per backend";
  const notes: NoteSegment[][] = [
    [{ kind: "text", text: "Percentiles are per backend; they are never added up or averaged across backends." }],
  ];

  if (backends.length === 0) {
    notes.unshift([{ kind: "text", text: "No runs in the last 7 days." }]);
  }

  return {
    id: "runs",
    title: "Runs by backend, last 7 days",
    lead: null,
    stats: backends.map((backend) => ({
      label: `${backend.backend} run time`,
      value: `p50 ${percentile(backend.p50Seconds)} · p95 ${percentile(backend.p95Seconds)}`,
    })),
    chart: backends.length === 0
      ? null
      : {
          kind: "stacked-rows",
          caption,
          summary: `${caption}: ${backends.map((backend, index) => (
            `${categories[index] ?? backend.backend}, ${formatValue(backend.completed)} completed, `
            + `${formatValue(backend.failed)} failed, ${formatValue(backend.abandoned)} abandoned`
          )).join("; ")}`,
          categories,
          series,
          levels: [],
          table: seriesTable("Backend", categories, series),
        },
    notes,
  };
}

function pullRequestsPanel(repo: RepoActivity): PanelView {
  const categories = repo.days.map((day) => formatUtcDay(day.t));
  const series: ChartSeriesView[] = [
    { name: "opened", values: repo.days.map((day) => day.opened), shape: "bar" },
    { name: "merged", values: repo.days.map((day) => day.merged), shape: "bar" },
    { name: "closed unmerged", values: repo.days.map((day) => day.closedUnmerged), shape: "bar" },
  ];
  const caption = "Pull requests per day (UTC)";

  return {
    id: "pull-requests",
    title: "Pull requests on this repo, last 7 days",
    lead: null,
    stats: [
      { label: "Median time to merge", value: mergeTime(repo.medianHoursToMerge) },
      { label: "p90 time to merge", value: mergeTime(repo.p90HoursToMerge) },
    ],
    chart: {
      kind: "bars",
      caption,
      summary: `${caption}: ${categories.length === 0 ? "no data yet" : describeTotals(series, categories)}`,
      categories,
      series,
      levels: [],
      table: seriesTable("Day", categories, series),
    },
    notes: [[{ kind: "text", text: "From public GitHub data for Tim-van-Oudheusden/website." }]],
  };
}

function mergedByPanel(repo: RepoActivity): PanelView {
  const days = repo.mergedBySource;
  const categories = days.map((day) => formatUtcDay(day.t));
  const series: ChartSeriesView[] = [
    { name: "Hive", values: days.map((day) => day.hive), shape: "bar" },
    { name: "Claude Code", values: days.map((day) => day.claudeCode), shape: "bar" },
    { name: "Dependabot", values: days.map((day) => day.dependabot), shape: "bar" },
    { name: "other", values: days.map((day) => day.other), shape: "bar" },
  ];
  const hive = sum(series[0]?.values ?? []);
  const merged = sum(series.flatMap((entry) => entry.values));
  const caption = "Merged PRs per day by author (UTC)";

  return {
    id: "merged-by",
    title: "Who wrote the merged work",
    lead: merged === 0
      ? "No PRs were merged in the last 7 days"
      : `Hive wrote ${formatValue(hive)} of ${plural(merged, "merged PR", "merged PRs")}`,
    stats: [],
    chart: merged === 0
      ? null
      : {
          kind: "stacked-bars",
          caption,
          summary: `${caption}: ${describeShares(series)}`,
          categories,
          series,
          levels: [],
          table: seriesTable("Day", categories, series),
        },
    notes: [[
      { kind: "text", text: "Split by author, not by who merged: a PR is Hive's when its body ends with Hive's signature line, then a " },
      { kind: "code", text: "claude/" },
      { kind: "text", text: " branch counts as Claude Code in CI and a " },
      { kind: "code", text: "dependabot/" },
      { kind: "text", text: " branch as Dependabot. " },
      { kind: "link", text: "How PRs are attributed", href: METRICS_README_URL },
    ]],
  };
}

/**
 * The view of one poll: the status, then either a fallback paragraph (loading, or nothing available) or the board.
 * `now` is the epoch ms relative times are measured against; `timeZone` an IANA zone, or `null` for the visitor's.
 */
export function buildHiveView(
  poll: PollingApiGetState<HiveMetricsResponse>,
  now: number,
  timeZone: string | null,
): HiveView {
  const status = resolveStatus(poll, now, timeZone);
  const metrics = poll.data?.state === "unavailable" ? null : poll.data?.metrics ?? null;

  if (poll.status === "loading") {
    return { status, fallback: "Loading the live numbers…", board: [] };
  }

  if (metrics === null || (metrics.hive === null && metrics.contributors === null && metrics.repo === null)) {
    return {
      status,
      fallback: "The live numbers are not available right now: this site cannot reach Hive or GitHub. "
        + "They fill in on their own once it can.",
      board: [],
    };
  }

  const { hive, contributors, repo } = metrics;

  return {
    status,
    fallback: null,
    board: [
      ...(hive === null
        ? [{ kind: "missing", part: "hive", text: "Live queue data is not connected right now." } as const]
        : [hiveKpis(hive), panelItem(queuePanel(hive, timeZone)), panelItem(modePanel(hive, timeZone))]),
      ...(contributors === null
        ? [{ kind: "missing", part: "contributors", text: "Contributor agent data is not available right now." } as const]
        : [panelItem(contributorsPanel(contributors, timeZone)), panelItem(runsPanel(contributors))]),
      ...(repo === null
        ? [{ kind: "missing", part: "repo", text: "Pull request data for this repo is not available right now." } as const]
        : [panelItem(pullRequestsPanel(repo)), panelItem(mergedByPanel(repo))]),
    ],
  };
}
