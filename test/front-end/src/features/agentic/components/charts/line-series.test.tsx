import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import type { LineSeriesProps } from "../../../../../../../front-end/src/features/agentic/components/charts/line-series";
import { LineSeries } from "../../../../../../../front-end/src/features/agentic/components/charts/line-series";

import { chartFigureParts } from "./chart-markup";

function renderQueue(series: LineSeriesProps["series"], xLabels: readonly string[]): string {
  return renderToStaticMarkup(<LineSeries caption="Queue, last 17 hours" xHeader="Time" xLabels={xLabels} series={series} />);
}

describe("LineSeries", () => {
  test("renders a captioned figure whose image label sums up every series and whose table holds every value", () => {
    const parts = chartFigureParts(
      renderQueue(
        [
          { name: "issues", tone: "accent", values: [9, 12, 14, 14] },
          { name: "PRs", tone: "ink", values: [4, 9, 7, 6] },
          { name: "held", tone: "base", values: [3, 3, 3, 3] },
        ],
        ["17 h ago", "12 h ago", "6 h ago", "now"],
      ),
    );

    expect(parts.caption).toBe("Queue, last 17 hours");

    expect(parts.imageLabel).toBe(
      "Queue, last 17 hours: issues between 9 and 14, now 14; PRs between 4 and 9, now 6; held steady at 3",
    );

    expect(parts.legend).toEqual(["issues", "PRs", "held"]);
    expect(parts.dataSummary).toBe("Show data");

    expect(parts.tableRows).toEqual([
      ["Time", "issues", "PRs", "held"],
      ["17 h ago", "9", "4", "3"],
      ["12 h ago", "12", "9", "3"],
      ["6 h ago", "14", "7", "3"],
      ["now", "14", "6", "3"],
    ]);
  });

  test("says so when there is no data, and labels a single point by its value", () => {
    expect(chartFigureParts(renderQueue([{ name: "issues", tone: "accent", values: [] }], [])).imageLabel).toBe(
      "Queue, last 17 hours: no data yet",
    );

    expect(chartFigureParts(renderQueue([{ name: "issues", tone: "accent", values: [5] }], ["now"])).imageLabel).toBe(
      "Queue, last 17 hours: issues now 5",
    );
  });
});
