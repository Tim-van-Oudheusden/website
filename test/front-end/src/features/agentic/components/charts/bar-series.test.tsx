import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import type { BarSeriesProps } from "../../../../../../../front-end/src/features/agentic/components/charts/bar-series";
import { BarSeries } from "../../../../../../../front-end/src/features/agentic/components/charts/bar-series";

import type { ChartFigureParts } from "./chart-markup";
import { chartFigureParts } from "./chart-markup";

const DAYS = ["Mon", "Tue", "Wed"];

function render(props: Pick<BarSeriesProps, "caption" | "layout" | "series"> & { xLabels?: readonly string[] }): ChartFigureParts {
  return chartFigureParts(renderToStaticMarkup(<BarSeries xHeader="Day" xLabels={DAYS} {...props} />));
}

describe("BarSeries", () => {
  test("renders grouped bars as a captioned figure with a total and peak per series and every value in the table", () => {
    const parts = render({
      caption: "Pull requests on this repo, last 7 days",
      layout: "grouped",
      series: [
        { name: "opened", tone: "accent", values: [5, 8, 3] },
        { name: "merged", tone: "green", values: [4, 9, 2] },
        { name: "closed unmerged", tone: "base", values: [0, 0, 0] },
      ],
    });

    expect(parts.caption).toBe("Pull requests on this repo, last 7 days");

    expect(parts.imageLabel).toBe(
      "Pull requests on this repo, last 7 days: opened 16 in total, most 8 (Tue); merged 15 in total, most 9 (Tue); closed unmerged none",
    );

    expect(parts.legend).toEqual(["opened", "merged", "closed unmerged"]);
    expect(parts.dataSummary).toBe("Show data");

    expect(parts.tableRows).toEqual([
      ["Day", "opened", "merged", "closed unmerged"],
      ["Mon", "5", "4", "0"],
      ["Tue", "8", "9", "0"],
      ["Wed", "3", "2", "0"],
    ]);
  });

  test("labels plain and stacked bars by total and peak", () => {
    expect(render({ caption: "Tasks per hour", layout: "grouped", series: [{ name: "tasks", tone: "accent", values: [2, 0, 7] }] }).imageLabel).toBe(
      "Tasks per hour: tasks 9 in total, most 7 (Wed)",
    );

    expect(
      render({
        caption: "Runs",
        layout: "stacked",
        series: [
          { name: "completed", tone: "green", values: [1, 2, 3] },
          { name: "failed", tone: "red", values: [1, 0, 0] },
        ],
      }).imageLabel,
    ).toBe("Runs: completed 6 in total, most 3 (Wed); failed 1 in total, most 1 (Mon)");
  });

  test("labels 100 % bars by each series' share of the whole and keeps the counts in the table", () => {
    const parts = render({
      caption: "Who wrote the merged work",
      layout: "percent",
      series: [
        { name: "Hive", tone: "accent", values: [3, 0, 2] },
        { name: "Dependabot", tone: "purple", values: [1, 0, 0] },
      ],
    });

    expect(parts.imageLabel).toBe("Who wrote the merged work: Hive 5 of 6; Dependabot 1 of 6");

    expect(parts.tableRows.slice(1)).toEqual([
      ["Mon", "3", "1"],
      ["Tue", "0", "0"],
      ["Wed", "2", "0"],
    ]);
  });

  test("says so when there is no data", () => {
    expect(render({ caption: "Tasks per hour", layout: "grouped", xLabels: [], series: [{ name: "tasks", tone: "accent", values: [] }] }).imageLabel).toBe(
      "Tasks per hour: no data yet",
    );

    expect(render({ caption: "Who wrote the merged work", layout: "percent", series: [{ name: "Hive", tone: "accent", values: [0, 0, 0] }] }).imageLabel).toBe(
      "Who wrote the merged work: no data yet",
    );
  });
});
