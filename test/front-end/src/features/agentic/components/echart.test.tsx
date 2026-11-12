import { afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";

import type { ECharts } from "echarts/core";
import { getInstanceByDom } from "echarts/core";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ChartOption, EChartProps } from "../../../../../../front-end/src/features/agentic/components/echart";
import { EChart } from "../../../../../../front-end/src/features/agentic/components/echart";
import type { FakeMount } from "../../../test/dom-harness";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../test/dom-harness";
import type { FakeElement } from "../../../test/fake-dom";
import { queryFakeElements } from "../../../test/fake-dom";

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

describe("EChart drawing", () => {
  const TABLE = { caption: "Tasks per hour", columns: ["Hour", "Tasks"], rows: [] };

  let mount: FakeMount | null = null;
  let restore: (() => void) | null = null;
  let themeClass = "";

  beforeAll(async () => {
    await initFakeDomHarness();
  });

  // The fake document is shared across test files: leave `<html>`'s class as it was found.
  beforeEach(() => {
    themeClass = document.documentElement.className;
  });

  afterEach(() => {
    if (mount !== null) {
      unmountFakeDomRoot(mount);
      mount = null;
    }

    restore?.();
    restore = null;
    document.documentElement.className = themeClass;
  });

  /** An option that draws no text: the fake DOM has no canvas to measure it with. */
  function painted(color: string): ChartOption {
    return { backgroundColor: color, series: [] };
  }

  function props(option: () => ChartOption): EChartProps {
    return { className: "h-64", label: "Tasks completed per hour", option, table: TABLE };
  }

  /** Mounts the chart and returns the box ECharts draws into. */
  function draw(option: () => ChartOption): FakeElement {
    mount = mountIntoBody(createElement(EChart, props(option)));
    const [host] = queryFakeElements(mount.container, (element) => element.getAttribute("role") === "img");

    if (host === undefined) {
      throw new Error("EChart rendered no role=img box");
    }

    return host;
  }

  function rerender(option: () => ChartOption): void {
    const { root } = mount ?? { root: null };

    act(() => {
      root?.render(createElement(EChart, props(option)));
    });
  }

  function chartIn(host: FakeElement): ECharts {
    const chart = getInstanceByDom(host as unknown as HTMLElement);

    if (chart === undefined) {
      throw new Error("No ECharts instance on the box");
    }

    return chart;
  }

  test("redraws only when a re-render builds a different option, so the page's age tick does not replay the animation", () => {
    const host = draw(() => painted("#100f0f"));
    const setOption = spyOn(chartIn(host), "setOption");

    rerender(() => painted("#100f0f"));
    expect(setOption).toHaveBeenCalledTimes(0);

    rerender(() => painted("#f2f0e5"));
    expect(setOption).toHaveBeenCalledTimes(1);
  });

  test("redraws when the site theme changes, so the colours follow the new tokens", () => {
    function option(): ChartOption {
      return painted("#100f0f");
    }

    const host = draw(option);
    const setOption = spyOn(chartIn(host), "setOption");

    document.documentElement.className = "dark";
    rerender(option);

    expect(setOption).toHaveBeenCalledTimes(1);
  });

  test("turns chart animation off when the visitor prefers reduced motion", () => {
    // The fake DOM's matchMedia never matches reduced motion, so this test answers it alone.
    const original = Object.getOwnPropertyDescriptor(window, "matchMedia");

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }),
    });

    restore = () => {
      if (original !== undefined) {
        Object.defineProperty(window, "matchMedia", original);
      }
    };

    const host = draw(() => painted("#100f0f"));

    expect(chartIn(host).getOption().animation).toBe(false);
  });

  test("keeps chart animation on otherwise", () => {
    const host = draw(() => painted("#100f0f"));

    expect(chartIn(host).getOption().animation).not.toBe(false);
  });

  test("disposes the chart when it unmounts", () => {
    const host = draw(() => ({ series: [] }));
    const chart = chartIn(host);

    if (mount !== null) {
      unmountFakeDomRoot(mount);
      mount = null;
    }

    expect(chart.isDisposed()).toBe(true);
  });
});
