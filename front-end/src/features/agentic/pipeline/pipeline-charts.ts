import type { LegendComponentOption, TooltipComponentOption, XAXisComponentOption, YAXisComponentOption } from "echarts";
import type { SankeySeriesOption } from "echarts/charts";
import type { LinearGradientObject } from "echarts/core";

import type { ChartOption, ChartTable, CssReader } from "../components/echart";
import type { BackendRunsView, ContributorsView, HiveWidgetView, MergedSource, RepoView } from "../lib/hive-view-model";
import { GOVERNOR_MODES } from "../lib/hive-view-model";

/** A chart as the page draws it: its option builder and the numbers behind it. */
export interface PipelineChart {
  label: string;
  option: (css: CssReader) => ChartOption;
  table: ChartTable;
}

/** Appends an alpha byte to a `#rrggbb` token, so glows and area fills derive from the accent. */
function alpha(color: string, opacity: number): string {
  if (!/^#[\da-f]{6}$/i.test(color)) {
    return color;
  }

  const byte = Math.round(Math.min(1, Math.max(0, opacity)) * 255).toString(16).padStart(2, "0");

  return `${color}${byte}`;
}

/** Reads one field of an ECharts callback's params without trusting their shape. */
function field(params: unknown, key: "name" | "value"): unknown {
  return typeof params === "object" && params !== null && key in params ? (params as Record<string, unknown>)[key] : null;
}

function fade(css: CssReader, token: string, top: number, bottom: number): LinearGradientObject {
  const color = css(token);

  return {
    type: "linear",
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: alpha(color, top) },
      { offset: 1, color: alpha(color, bottom) },
    ],
  };
}

function tooltip(css: CssReader, trigger: "axis" | "item"): TooltipComponentOption {
  return {
    trigger,
    confine: true,
    backgroundColor: css("--pl-c-panel"),
    borderColor: css("--pl-c-accent"),
    borderWidth: 1,
    textStyle: { color: css("--pl-c-text"), fontSize: 12 },
    extraCssText: `box-shadow: 0 0 18px ${alpha(css("--pl-c-glow"), 0.45)}; border-radius: 10px;`,
    ...(trigger === "axis" ? { axisPointer: { type: "line", lineStyle: { color: css("--pl-c-accent") } } } : {}),
  };
}

function legend(css: CssReader): LegendComponentOption {
  return {
    top: 0,
    left: 0,
    icon: "roundRect",
    itemWidth: 14,
    itemHeight: 8,
    itemGap: 14,
    textStyle: { color: css("--pl-c-ink"), fontSize: 12 },
  };
}

function categoryAxis(css: CssReader, data: string[], bars = false): XAXisComponentOption {
  return {
    type: "category",
    data,
    boundaryGap: bars || data.length < 3,
    axisLine: { lineStyle: { color: css("--pl-c-axis") } },
    axisTick: { show: false },
    axisLabel: { color: css("--pl-c-ink"), hideOverlap: true, fontSize: 11 },
  };
}

function valueAxis(css: CssReader): YAXisComponentOption {
  return {
    type: "value",
    minInterval: 1,
    splitNumber: 3,
    axisLabel: { color: css("--pl-c-ink"), fontSize: 11 },
    splitLine: { lineStyle: { color: css("--pl-c-grid"), type: "dashed" } },
  };
}

/** Axis labels stay inside the grid's margins, so every chart keeps its padding inside the panel. */
const GRID = { left: 6, right: 12, top: 36, bottom: 4, outerBoundsMode: "same" } as const;

/** Issues and PRs stacked as open work, held work as a dashed line beside them. */
export function queueChart(hive: HiveWidgetView): PipelineChart {
  const labels = hive.history.map((point) => point.label);
  const dense = hive.history.length > 24;
  const title = hive.span === null ? "Queue, latest point" : `Queue, ${hive.span}`;

  return {
    label: `${title}: open issues, open pull requests and held work per governor evaluation`,
    table: {
      caption: title,
      columns: ["Time", "Issues", "Pull requests", "Held"],
      rows: hive.history.map((point) => [point.label, point.issues, point.prs, point.held]),
    },
    option: (css) => ({
      grid: GRID,
      legend: legend(css),
      tooltip: tooltip(css, "axis"),
      xAxis: categoryAxis(css, labels),
      yAxis: valueAxis(css),
      series: [
        {
          name: "Issues",
          type: "line",
          stack: "open",
          smooth: 0.35,
          smoothMonotone: "x",
          showSymbol: !dense,
          symbolSize: 7,
          data: hive.history.map((point) => point.issues),
          color: css("--pl-c-accent"),
          lineStyle: { width: 2.5, shadowBlur: 12, shadowColor: alpha(css("--pl-c-glow"), 0.8) },
          areaStyle: { color: fade(css, "--pl-c-accent", 0.55, 0.08) },
        },
        {
          name: "Pull requests",
          type: "line",
          stack: "open",
          smooth: 0.35,
          smoothMonotone: "x",
          showSymbol: !dense,
          symbolSize: 7,
          data: hive.history.map((point) => point.prs),
          color: css("--pl-c-second"),
          lineStyle: { width: 2 },
          areaStyle: { color: fade(css, "--pl-c-second", 0.35, 0.04) },
        },
        {
          name: "Held",
          type: "line",
          smooth: 0.35,
          smoothMonotone: "x",
          showSymbol: !dense,
          symbolSize: 6,
          data: hive.history.map((point) => point.held),
          color: css("--pl-c-muted"),
          lineStyle: { width: 1.5, type: "dashed" },
        },
      ],
    }),
  };
}

/** The governor's mode at each evaluation, as a glowing step line over the four modes. */
export function modeChart(hive: HiveWidgetView): PipelineChart {
  const title = hive.span === null ? "Governor mode, latest point" : `Governor mode, ${hive.span}`;

  return {
    label: `${title}: idle, quiet, busy or surge at each evaluation`,
    table: {
      caption: title,
      columns: ["Time", "Mode"],
      rows: hive.history.map((point) => [point.label, point.mode]),
    },
    option: (css) => ({
      grid: { ...GRID, top: 10 },
      tooltip: tooltip(css, "axis"),
      xAxis: categoryAxis(css, hive.history.map((point) => point.label)),
      yAxis: {
        type: "category",
        data: [...GOVERNOR_MODES],
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: css("--pl-c-ink"), fontSize: 11 },
        splitLine: { show: true, lineStyle: { color: css("--pl-c-grid"), type: "dashed" } },
      },
      series: [
        {
          name: "Mode",
          type: "line",
          step: "end",
          showSymbol: hive.history.length <= 24,
          symbolSize: 7,
          data: hive.history.map((point) => point.mode),
          color: css("--pl-c-accent"),
          lineStyle: { width: 2.5, shadowBlur: 14, shadowColor: alpha(css("--pl-c-glow"), 0.9) },
        },
      ],
    }),
  };
}

/** Contributor tasks as one bar per hour, the peak hour marked; past a day, the axis names where each day starts. */
export function tasksChart(contributors: ContributorsView): PipelineChart {
  const { hours, peak, span } = contributors;
  const days = hours.length > 24;
  // A day starts where the weekday changes from the bucket before; the clock text is no guide, since a zone with a
  // fractional UTC offset has no ":00" midnight bucket. The series' first bucket has nothing to compare with.
  const weekday = (label: string): string => label.slice(0, label.indexOf(" "));
  const startsDay = (index: number, label: string): boolean =>
    index > 0 && weekday(label) !== weekday(hours[index - 1]?.label ?? label);

  return {
    label: `Tasks per hour, ${span}, by contributor agents`,
    table: {
      caption: "Tasks per hour",
      columns: ["Hour", "Tasks", "Contributor agents"],
      rows: hours.map((hour) => [hour.label, hour.tasks, hour.fleet]),
    },
    option: (css) => ({
      grid: { ...GRID, top: 14 },
      tooltip: { ...tooltip(css, "axis"), axisPointer: { type: "shadow" } },
      xAxis: {
        type: "category",
        data: hours.map((hour) => hour.label),
        axisLine: { lineStyle: { color: css("--pl-c-axis") } },
        axisTick: days ? { interval: startsDay, lineStyle: { color: css("--pl-c-axis") } } : { show: false },
        axisLabel: {
          color: css("--pl-c-ink"),
          fontSize: 11,
          ...(days
            ? { interval: startsDay, formatter: weekday }
            : { hideOverlap: true }),
        },
      },
      yAxis: valueAxis(css),
      series: [
        {
          name: "Tasks",
          type: "bar",
          barCategoryGap: "20%",
          data: hours.map((hour) => hour.tasks),
          color: css("--pl-c-accent"),
          itemStyle: { borderRadius: [2, 2, 0, 0], shadowBlur: 8, shadowColor: alpha(css("--pl-c-glow"), 0.6) },
          ...(peak === null
            ? {}
            : {
                markPoint: {
                  symbol: "circle",
                  symbolSize: 12,
                  itemStyle: {
                    color: css("--pl-c-panel"),
                    borderColor: css("--pl-c-accent"),
                    borderWidth: 3,
                    shadowBlur: 14,
                    shadowColor: css("--pl-c-glow"),
                  },
                  label: { show: false },
                  data: [{ type: "max", name: "Peak" }],
                },
              }),
        },
      ],
    }),
  };
}

/** Each backend's runs split into completed, failed and abandoned, as one stacked bar per backend. */
export function runsChart(backends: BackendRunsView[]): PipelineChart {
  const names = backends.map((backend) => backend.name);

  const parts = [
    { name: "Completed", token: "--pl-c-accent", data: backends.map((backend) => backend.completed) },
    { name: "Failed", token: "--pl-c-fail", data: backends.map((backend) => backend.failed) },
    { name: "Abandoned", token: "--pl-c-abandon", data: backends.map((backend) => backend.abandoned) },
  ];

  return {
    label: "Runs by backend over the last 7 days: completed, failed and abandoned",
    table: {
      caption: "Runs by backend, last 7 days",
      columns: ["Backend", "Completed", "Failed", "Abandoned", "p50", "p95"],
      rows: backends.map((backend) => [
        backend.name,
        backend.completed,
        backend.failed,
        backend.abandoned,
        backend.p50 ?? "not reported",
        backend.p95 ?? "not reported",
      ]),
    },
    option: (css) => ({
      grid: { ...GRID, right: 16, top: 34 },
      legend: legend(css),
      tooltip: { ...tooltip(css, "axis"), axisPointer: { type: "shadow" } },
      xAxis: {
        type: "value",
        minInterval: 1,
        splitNumber: 4,
        axisLabel: { color: css("--pl-c-ink"), fontSize: 11 },
        splitLine: { lineStyle: { color: css("--pl-c-grid"), type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: css("--pl-c-axis") } },
        axisTick: { show: false },
        axisLabel: { color: css("--pl-c-text"), fontSize: 12, fontWeight: "bold" },
      },
      series: parts.map((part, index) => ({
        name: part.name,
        type: "bar",
        stack: "runs",
        barMaxWidth: 26,
        data: part.data,
        color: css(part.token),
        itemStyle: index === 0
          ? { shadowBlur: 12, shadowColor: alpha(css("--pl-c-glow"), 0.7), borderRadius: [4, 0, 0, 4] }
          : {},
        label: {
          show: true,
          position: "inside",
          color: css(index === 0 ? "--pl-c-on-accent" : "--pl-c-text"),
          fontSize: 11,
          fontWeight: "bold",
          formatter: (params: unknown): string => {
            const value = field(params, "value");

            return typeof value === "number" && value > 0 ? String(value) : "";
          },
        },
      })),
    }),
  };
}

/** Opened, merged and closed-unmerged pull requests per UTC day. */
export function pullRequestsChart(repo: RepoView): PipelineChart {
  const series = [
    { name: "Opened", token: "--pl-c-opened", pick: (day: RepoView["days"][number]): number => day.opened },
    { name: "Merged", token: "--pl-c-accent", pick: (day: RepoView["days"][number]): number => day.merged },
    {
      name: "Closed unmerged",
      token: "--pl-c-fail",
      pick: (day: RepoView["days"][number]): number => day.closedUnmerged,
    },
  ];

  return {
    label: "Pull requests per UTC day, last 7 days: opened, merged and closed unmerged",
    table: {
      caption: "Pull requests per UTC day",
      columns: ["Day", "Opened", "Merged", "Closed unmerged"],
      rows: repo.days.map((day) => [day.label, day.opened, day.merged, day.closedUnmerged]),
    },
    option: (css) => ({
      grid: GRID,
      legend: legend(css),
      tooltip: { ...tooltip(css, "axis"), axisPointer: { type: "shadow" } },
      xAxis: categoryAxis(css, repo.days.map((day) => day.label), true),
      yAxis: valueAxis(css),
      series: series.map((entry) => ({
        name: entry.name,
        type: "bar",
        barGap: "15%",
        barMaxWidth: 16,
        data: repo.days.map(entry.pick),
        color: css(entry.token),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          ...(entry.token === "--pl-c-accent" ? { shadowBlur: 12, shadowColor: alpha(css("--pl-c-glow"), 0.75) } : {}),
        },
      })),
    }),
  };
}

const SOURCE_TOKENS: Record<MergedSource, string> = {
  hive: "--pl-c-accent",
  claudeCode: "--pl-c-claude",
  dependabot: "--pl-c-dependabot",
  other: "--pl-c-other",
};

/** Finished PRs flowing into merged or closed unmerged, then merged PRs into who wrote them. */
export function outcomesSankey(repo: RepoView): PipelineChart {
  const authors = repo.sources.filter((source) => source.merged > 0);
  const finished = repo.merged + repo.totals.closedUnmerged;
  const links = [
    { source: "Finished", target: "Merged", value: repo.merged },
    { source: "Finished", target: "Closed unmerged", value: repo.totals.closedUnmerged },
    ...authors.map((author) => ({ source: "Merged", target: author.name, value: author.merged })),
  ].filter((link) => link.value > 0);

  return {
    label: "Pull request outcomes over 7 days: finished pull requests into merged or closed unmerged, "
      + "and merged pull requests by author",
    table: {
      caption: "Pull request outcomes and authors, last 7 days",
      columns: ["From", "To", "Pull requests"],
      rows: links.map((link) => [link.source, link.target, link.value]),
    },
    option: (css) => {
      const values: Record<string, number> = {
        "Finished": finished,
        "Merged": repo.merged,
        "Closed unmerged": repo.totals.closedUnmerged,
        ...Object.fromEntries(authors.map((author) => [author.name, author.merged])),
      };
      const nodeTokens: Record<string, string> = {
        "Finished": "--pl-c-second",
        "Merged": "--pl-c-accent",
        "Closed unmerged": "--pl-c-fail",
        ...Object.fromEntries(authors.map((author) => [author.name, SOURCE_TOKENS[author.key]])),
      };
      const names = Object.keys(values).filter((name) => (values[name] ?? 0) > 0);

      const sankey: SankeySeriesOption = {
        type: "sankey",
        left: 4,
        right: 118,
        top: 30,
        bottom: 8,
        nodeWidth: 12,
        nodeGap: 12,
        nodeAlign: "justify",
        draggable: false,
        emphasis: { focus: "adjacency" },
        data: names.map((name) => ({
          name,
          // The two inner nodes carry their label above them, clear of the flows.
          ...(name === "Finished" || name === "Merged" ? { label: { position: [0, -18] } } : {}),
          itemStyle: {
            color: css(nodeTokens[name] ?? "--pl-c-other"),
            borderWidth: 0,
            shadowBlur: name === "Merged" ? 16 : 0,
            shadowColor: css("--pl-c-glow"),
          },
        })),
        links,
        lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
        label: {
          color: css("--pl-c-text"),
          fontSize: 12,
          textBorderColor: css("--pl-c-panel"),
          textBorderWidth: 3,
          formatter: (params: unknown): string => {
            const name = String(field(params, "name"));

            return `${name} · ${String(values[name] ?? 0)}`;
          },
        },
      };

      return { tooltip: tooltip(css, "item"), series: [sankey] };
    },
  };
}

/** Merged PRs per UTC day, stacked by who wrote them; only authors with merges get a series. */
export function authorsChart(repo: RepoView): PipelineChart {
  const authors = repo.sources.filter((source) => source.merged > 0);

  return {
    label: "Merged pull requests per UTC day by author, last 7 days",
    table: {
      caption: "Merged pull requests per UTC day by author",
      columns: ["Day", ...authors.map((author) => author.name)],
      rows: repo.mergedBySource.map((day) => [day.label, ...authors.map((author) => day[author.key])]),
    },
    option: (css) => ({
      grid: GRID,
      legend: legend(css),
      tooltip: { ...tooltip(css, "axis"), axisPointer: { type: "shadow" } },
      xAxis: categoryAxis(css, repo.mergedBySource.map((day) => day.label), true),
      yAxis: valueAxis(css),
      series: authors.map((author, index) => ({
        name: author.name,
        type: "bar",
        stack: "authors",
        barMaxWidth: 28,
        data: repo.mergedBySource.map((day) => day[author.key]),
        color: css(SOURCE_TOKENS[author.key]),
        itemStyle: {
          borderRadius: index === authors.length - 1 ? [4, 4, 0, 0] : 0,
          ...(author.key === "hive" ? { shadowBlur: 12, shadowColor: alpha(css("--pl-c-glow"), 0.7) } : {}),
        },
      })),
    }),
  };
}
