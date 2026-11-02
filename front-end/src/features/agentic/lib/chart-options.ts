import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, TooltipComponentOption } from "echarts/components";
import type { EChartsCoreOption } from "echarts/core";

import type { DesignPalette } from "../config/agentic-designs";

import type { ChartSeriesView, HiveChartView } from "./hive-view-model";

export interface ChartMotion {
  /** False under `prefers-reduced-motion: reduce`. */
  animate: boolean;
  /** The CSS font family the design sets on the chart, so axis text matches the page. */
  font: string;
}

/** A dash per line series after the first, so lines never differ by colour alone. */
const LINE_DASHES = ["solid", "dashed", "dotted", "dashed"] as const;

/** A fill pattern per bar series after the first, so bars never differ by colour alone. */
const BAR_DECALS = ["none", "rect", "circle", "triangle"] as const;

type AxisOption = Record<string, unknown>;

function lineSeries(
  series: ChartSeriesView,
  index: number,
  colour: string,
  chart: HiveChartView,
  palette: DesignPalette,
): LineSeriesOption {
  const first = index === 0;

  return {
    type: "line",
    name: series.name,
    data: [...series.values],
    color: colour,
    step: chart.kind === "steps" ? "end" : false,
    // One point is a dot, not an invisible line.
    showSymbol: series.values.length === 1 || chart.kind !== "bars",
    symbolSize: 6,
    lineStyle: { width: first ? 3 : 2, type: LINE_DASHES[index % LINE_DASHES.length] ?? "solid" },
    // The accent line glows over a soft fill; later lines stay plain.
    ...(first && chart.kind !== "bars" ? { areaStyle: { color: palette.glow, opacity: 0.18 } } : {}),
    emphasis: { focus: "series" },
    z: 3,
  };
}

function barSeries(series: ChartSeriesView, index: number, colour: string, chart: HiveChartView): BarSeriesOption {
  const stacked = chart.kind === "stacked-bars" || chart.kind === "stacked-rows";

  return {
    type: "bar",
    name: series.name,
    data: [...series.values],
    color: colour,
    ...(stacked ? { stack: "total" } : {}),
    barMaxWidth: 28,
    itemStyle: {
      decal: {
        symbol: BAR_DECALS[index % BAR_DECALS.length] ?? "none",
        symbolSize: 0.6,
        dashArrayX: 6,
        dashArrayY: 4,
        color: "rgba(0, 0, 0, 0.32)",
      },
    },
    emphasis: { focus: "series" },
  };
}

/**
 * The ECharts option for one chart of the view model in one design's palette: no title or legend (the figure
 * carries both as HTML), transparent so the design's panel shows through.
 */
export function buildChartOption(chart: HiveChartView, palette: DesignPalette, motion: ChartMotion): EChartsCoreOption {
  const axisLabel = { color: palette.muted, fontFamily: motion.font, fontSize: 12, hideOverlap: true };
  const axisLine = { lineStyle: { color: palette.grid } };
  const splitLine = { lineStyle: { color: palette.grid, type: "dashed" as const } };
  const categoryAxis: AxisOption = {
    type: "category",
    data: [...chart.categories],
    axisLabel,
    axisLine,
    axisTick: { show: false },
    boundaryGap: chart.kind !== "line" && chart.kind !== "steps",
  };
  const valueAxis: AxisOption = { type: "value", minInterval: 1, axisLabel, splitLine };
  const levelAxis: AxisOption = { type: "category", data: [...chart.levels], axisLabel, splitLine: { ...splitLine, show: true }, boundaryGap: false };
  const series = chart.series.map((entry, index) => {
    const colour = palette.series[index % palette.series.length] ?? palette.accent;

    return entry.shape === "line" || chart.kind === "line" || chart.kind === "steps"
      ? lineSeries(entry, index, colour, chart, palette)
      : barSeries(entry, index, colour, chart);
  });
  const grid: GridComponentOption = {
    left: 4,
    right: 12,
    top: 12,
    bottom: 4,
    outerBoundsMode: "same",
    outerBoundsContain: "axisLabel",
  };
  const tooltip: TooltipComponentOption = {
    trigger: "axis",
    confine: true,
    backgroundColor: palette.surface,
    borderColor: palette.accent,
    textStyle: { color: palette.ink, fontFamily: motion.font },
    axisPointer: { type: chart.kind === "line" || chart.kind === "steps" ? "line" : "shadow" },
    // The mode chart's values are level indexes; the tooltip names the level.
    ...(chart.kind === "steps"
      ? { valueFormatter: (value): string => (typeof value === "number" ? chart.levels[value] ?? "" : "") }
      : {}),
  };
  let axes: { xAxis: AxisOption; yAxis: AxisOption } = { xAxis: categoryAxis, yAxis: valueAxis };

  if (chart.kind === "stacked-rows") {
    axes = { xAxis: valueAxis, yAxis: { ...categoryAxis, inverse: true } };
  } else if (chart.kind === "steps") {
    axes = { xAxis: categoryAxis, yAxis: levelAxis };
  }

  return {
    animation: motion.animate,
    animationDuration: 700,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    textStyle: { fontFamily: motion.font, color: palette.ink },
    grid,
    tooltip,
    ...axes,
    series,
  };
}
