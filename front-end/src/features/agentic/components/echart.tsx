import type { BarSeriesOption, LineSeriesOption, SankeySeriesOption } from "echarts/charts";
import { BarChart, LineChart, SankeyChart } from "echarts/charts";
import type {
  GridComponentOption,
  LegendComponentOption,
  MarkPointComponentOption,
  TooltipComponentOption,
} from "echarts/components";
import { GridComponent, LegendComponent, MarkPointComponent, TooltipComponent } from "echarts/components";
import type { ComposeOption, ECharts } from "echarts/core";
import { init, use as registerChartParts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { JSX } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";

/* Only what the page draws, so the chart chunk carries no unused chart types. */
registerChartParts([
  BarChart,
  LineChart,
  SankeyChart,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TooltipComponent,
  CanvasRenderer,
]);

/** An ECharts option limited to the charts and components registered above. */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | SankeySeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkPointComponentOption
  | TooltipComponentOption
>;

/** Reads a CSS custom property (or any property) as resolved on the chart, e.g. `css("--accent")`. */
export type CssReader = (property: string) => string;

/** The chart's numbers for screen readers: the first column heads each row. */
export interface ChartTable {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}

export interface EChartProps {
  /** The chart's accessible name. */
  label: string;
  /**
   * Builds the option from the design's tokens; rebuilt when the site theme changes, so colours come from CSS
   * custom properties rather than hard-coded hex. Canvas text defaults to the chart's own font family.
   */
  option: (css: CssReader) => ChartOption;
  table: ChartTable;
  /** Sizes the chart: the canvas fills this box, so it needs a height. */
  className: string;
}

function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return () => {
    observer.disconnect();
  };
}

/** `<html>`'s class list, which carries `.dark`: a change means the design's tokens may resolve differently. */
function useThemeClass(): string {
  return useSyncExternalStore(subscribeToThemeClass, () => document.documentElement.className, () => "");
}

/**
 * An Apache ECharts canvas drawn from an option builder. The canvas is one image to assistive tech, named by `label`;
 * a visually hidden table carries its numbers. Honours reduced motion by turning chart animation off.
 */
export function EChart({ label, option, table, className }: EChartProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const drawnRef = useRef<string | null>(null);
  const themeClass = useThemeClass();

  useEffect(() => {
    const host = hostRef.current;

    if (host === null) {
      return undefined;
    }

    const chart = init(host, null, { renderer: "canvas" });
    const observer = new ResizeObserver(() => {
      chart.resize();
    });

    chartRef.current = chart;
    observer.observe(host);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
      drawnRef.current = null;
    };
  }, []);

  // Every render rebuilds the option, but the chart redraws only when it or the theme changed: the page re-renders
  // every few seconds to age its "updated 40 s ago", which must not replay the chart's entry animation.
  useEffect(() => {
    const host = hostRef.current;
    const chart = chartRef.current;

    if (host === null || chart === null) {
      return;
    }

    const styles = getComputedStyle(host);
    const built = option((property) => styles.getPropertyValue(property).trim());
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next: ChartOption = {
      textStyle: { fontFamily: styles.fontFamily },
      ...built,
      ...(reducedMotion ? { animation: false } : {}),
    };
    const key = `${themeClass}|${JSON.stringify(next)}`;

    if (drawnRef.current !== key) {
      chart.setOption(next, { notMerge: true });
      drawnRef.current = key;
    }
  });

  const [, ...valueColumns] = table.columns;

  return (
    <div className={className}>
      <div ref={hostRef} className="size-full" role="img" aria-label={label} />
      {/* The box, not the table, is visually hidden: a table grows to fit its rows whatever its height says. */}
      <div className="sr-only">
        <table>
          <caption>{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((column) => <th key={column} scope="col">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => {
              const [head, ...cells] = row;

              return (
                <tr key={JSON.stringify(row)}>
                  <th scope="row">{head}</th>
                  {valueColumns.map((column, index) => <td key={column}>{cells[index]}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
