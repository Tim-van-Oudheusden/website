import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EChart } from "../../../../../../front-end/src/features/agentic/components/echart";

describe("EChart", () => {
  test("names the drawing for assistive tech, which reads the numbers from a table instead", () => {
    const markup = renderToStaticMarkup(createElement(EChart, {
      className: "h-64",
      label: "Tasks completed per hour",
      option: () => ({ series: [] }),
      table: { caption: "Tasks per hour", columns: ["Hour", "Tasks"], rows: [["Mon 13:00", 4], ["Mon 14:00", 0]] },
    }));

    expect(markup).toContain("role=\"img\" aria-label=\"Tasks completed per hour\"");
    expect(markup).toContain("<caption>Tasks per hour</caption>");
    expect(markup).toContain("<th scope=\"col\">Hour</th><th scope=\"col\">Tasks</th>");
    expect(markup).toContain("<tr><th scope=\"row\">Mon 13:00</th><td>4</td></tr><tr><th scope=\"row\">Mon 14:00</th><td>0</td></tr>");
  });
});
