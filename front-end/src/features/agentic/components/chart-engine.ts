import type { EChartsCoreOption } from "echarts/core";
import { createContext } from "react";

/** One chart drawn into a host element. */
export interface ChartHandle {
  /** The font family the host's design sets, for the chart's own text. */
  font: string;
  render: (option: EChartsCoreOption) => void;
  dispose: () => void;
}

/** What draws the charts: ECharts in the app, a recorder in tests. */
export interface ChartEngine {
  mountChart: (host: HTMLElement) => ChartHandle;
}

export type LoadChartEngine = () => Promise<ChartEngine>;

/** ECharts is large, so it loads in its own chunk once the first chart mounts; the page text never waits for it. */
async function loadEcharts(): Promise<ChartEngine> {
  return import("../lib/echarts-engine");
}

/** The engine charts load; the default loads ECharts on demand. */
export const ChartEngineContext = createContext<LoadChartEngine>(loadEcharts);
