import { describe, expect, test } from "bun:test";

import { AGENTIC_DESIGNS, designPalette } from "../../../../../../front-end/src/features/agentic/config/agentic-designs";
import { buildChartOption } from "../../../../../../front-end/src/features/agentic/lib/chart-options";
import type { ChartKind, ChartSeriesView, HiveChartView } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";

const [DESIGN] = AGENTIC_DESIGNS;

if (DESIGN === undefined) {
  throw new Error("No designs");
}

const PALETTE = designPalette(DESIGN, "dark");
const MOTION = { animate: true, font: "serif" };

const BARS: ChartSeriesView[] = [
  { name: "one", values: [1, 2, 3], shape: "bar" },
  { name: "two", values: [3, 2, 1], shape: "bar" },
  { name: "three", values: [0, 1, 0], shape: "line" },
];

function chart(kind: ChartKind, overrides: Partial<HiveChartView> = {}): HiveChartView {
  return {
    kind,
    caption: "Caption",
    summary: "Caption: summary",
    categories: ["a", "b", "c"],
    series: BARS,
    levels: [],
    table: { header: [], rows: [] },
    ...overrides,
  };
}

describe("buildChartOption", () => {
  test("colours the series from the design's palette in order, the accent first", () => {
    expect(buildChartOption(chart("bars"), PALETTE, MOTION)).toMatchObject({
      series: [{ color: PALETTE.accent }, { color: PALETTE.series[1] }, { color: PALETTE.series[2] }],
    });
  });

  test("never tells series apart by colour alone: later bars carry a pattern, later lines a dash", () => {
    const lines = BARS.map((series) => ({ ...series, shape: "line" as const }));
    const bars = BARS.map((series) => ({ ...series, shape: "bar" as const }));

    expect(buildChartOption(chart("line", { series: lines }), PALETTE, MOTION)).toMatchObject({
      series: [{ lineStyle: { type: "solid" } }, { lineStyle: { type: "dashed" } }, { lineStyle: { type: "dotted" } }],
    });

    expect(buildChartOption(chart("stacked-bars", { series: bars }), PALETTE, MOTION)).toMatchObject({
      series: [
        { itemStyle: { decal: { symbol: "none" } } },
        { itemStyle: { decal: { symbol: "rect" } } },
        { itemStyle: { decal: { symbol: "circle" } } },
      ],
    });
  });

  test("draws a bar series as bars and a line series over them as a line", () => {
    expect(buildChartOption(chart("bars"), PALETTE, MOTION)).toMatchObject({
      series: [{ type: "bar", data: [1, 2, 3] }, { type: "bar", data: [3, 2, 1] }, { type: "line", data: [0, 1, 0] }],
    });
  });

  test("stacks only the stacked kinds", () => {
    const bars = BARS.map((series) => ({ ...series, shape: "bar" as const }));

    function stacks(kind: ChartKind): unknown[] {
      const { series } = buildChartOption(chart(kind, { series: bars }), PALETTE, MOTION);

      return (Array.isArray(series) ? series : [])
        .map((entry: unknown) => (typeof entry === "object" && entry !== null && "stack" in entry ? entry.stack : "none"));
    }

    expect(stacks("bars")).toEqual(["none", "none", "none"]);
    expect(stacks("stacked-bars")).toEqual(["total", "total", "total"]);
  });

  test("lays stacked rows out across, with the categories down the side in reading order", () => {
    expect(buildChartOption(chart("stacked-rows"), PALETTE, MOTION)).toMatchObject({
      xAxis: { type: "value" },
      yAxis: { type: "category", data: ["a", "b", "c"], inverse: true },
    });
  });

  test("steps the mode chart through its named levels", () => {
    const steps = chart("steps", {
      series: [{ name: "mode", values: [0, 2, 3], shape: "line" }],
      levels: ["idle", "quiet", "busy", "surge"],
    });

    expect(buildChartOption(steps, PALETTE, MOTION)).toMatchObject({
      yAxis: { type: "category", data: ["idle", "quiet", "busy", "surge"] },
      series: [{ type: "line", step: "end", data: [0, 2, 3] }],
    });
  });

  test("animates only when motion is allowed", () => {
    expect(buildChartOption(chart("line"), PALETTE, MOTION)).toMatchObject({ animation: true });
    expect(buildChartOption(chart("line"), PALETTE, { ...MOTION, animate: false })).toMatchObject({ animation: false });
  });
});
