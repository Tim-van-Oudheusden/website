import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import type { StackedRowProps } from "../../../../../../../front-end/src/features/agentic/components/charts/stacked-row";
import { StackedRow } from "../../../../../../../front-end/src/features/agentic/components/charts/stacked-row";

import type { ChartFigureParts } from "./chart-markup";
import { chartFigureParts } from "./chart-markup";

function render(parts: StackedRowProps["parts"]): ChartFigureParts {
  return chartFigureParts(renderToStaticMarkup(<StackedRow caption="omp, last 7 days" partHeader="Outcome" parts={parts} />));
}

describe("StackedRow", () => {
  test("renders a captioned figure labelled with the total and every part, with counts and shares in the table", () => {
    const parts = render([
      { name: "completed", tone: "green", value: 62 },
      { name: "failed", tone: "red", value: 9 },
      { name: "abandoned", tone: "base", value: 4 },
    ]);

    expect(parts.caption).toBe("omp, last 7 days");
    expect(parts.imageLabel).toBe("omp, last 7 days: 75 in total, 62 completed, 9 failed, 4 abandoned");
    expect(parts.legend).toEqual(["completed", "failed", "abandoned"]);
    expect(parts.dataSummary).toBe("Show data");

    expect(parts.tableRows).toEqual([
      ["Outcome", "Count", "Share"],
      ["completed", "62", "83%"],
      ["failed", "9", "12%"],
      ["abandoned", "4", "5%"],
    ]);
  });

  test("says so when every part is zero, without dividing by zero", () => {
    const parts = render([
      { name: "completed", tone: "green", value: 0 },
      { name: "failed", tone: "red", value: 0 },
    ]);

    expect(parts.imageLabel).toBe("omp, last 7 days: none yet");

    expect(parts.tableRows.slice(1)).toEqual([
      ["completed", "0", "0%"],
      ["failed", "0", "0%"],
    ]);
  });
});
