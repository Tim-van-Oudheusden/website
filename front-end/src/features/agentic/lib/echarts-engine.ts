/**
 * The ECharts build the Agentic charts use: only the bar and line charts, the grid, the tooltip and the SVG renderer
 * (crisp at any zoom, and styled text stays text). Loaded lazily through `ChartEngineContext`.
 */

import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import type { EChartsCoreOption } from "echarts/core";
import { init, use as registerEcharts } from "echarts/core";
import { SVGRenderer } from "echarts/renderers";

import type { ChartHandle } from "../components/chart-engine";

registerEcharts([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

/** Draws into `host` and follows its size; `render` skips an option identical to the one on screen. */
export function mountChart(host: HTMLElement): ChartHandle {
  const chart = init(host, null, { renderer: "svg" });
  const observer = new ResizeObserver(() => {
    chart.resize();
  });
  let drawn = "";

  observer.observe(host);

  return {
    font: getComputedStyle(host).fontFamily,
    render: (option: EChartsCoreOption) => {
      // The page re-renders every few seconds to age its status line; an unchanged chart must not replay its animation.
      const key = JSON.stringify(option);

      if (key !== drawn) {
        drawn = key;
        chart.setOption(option, { notMerge: true });
      }
    },
    dispose: () => {
      observer.disconnect();
      chart.dispose();
    },
  };
}
