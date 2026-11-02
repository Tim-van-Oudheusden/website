import type { CSSProperties, JSX } from "react";
import { use, useEffect, useRef, useState } from "react";

import type { DesignPalette } from "../config/agentic-designs";
import { buildChartOption } from "../lib/chart-options";
import type { HiveChartView } from "../lib/hive-view-model";

import type { ChartHandle } from "./chart-engine";
import { ChartEngineContext } from "./chart-engine";

type SwatchStyle = CSSProperties & Record<"--ag-swatch", string>;

interface HiveChartProps {
  chart: HiveChartView;
  palette: DesignPalette;
  animate: boolean;
}

/**
 * One chart as a `<figure>`: its caption, a legend that names every series (colour is never the only cue), the
 * ECharts plot as an image named by the data's takeaway, and a "Show data" table with every value. The table opens
 * by itself if the chart library cannot load.
 */
export function HiveChart({ chart, palette, animate }: HiveChartProps): JSX.Element {
  const loadEngine = use(ChartEngineContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const [handle, setHandle] = useState<ChartHandle | null>(null);
  const [failed, setFailed] = useState(false);
  const [corner, ...columns] = chart.table.header;
  let state = handle === null ? "loading" : "ready";

  if (failed) {
    state = "failed";
  }

  useEffect(() => {
    const element = hostRef.current;
    let mounted: ChartHandle | null = null;
    let live = true;

    if (element === null) {
      return;
    }

    loadEngine().then(
      (engine) => {
        if (live) {
          mounted = engine.mountChart(element);
          setHandle(mounted);
        }
      },
      () => {
        if (live) {
          setFailed(true);
        }
      },
    );

    return () => {
      live = false;
      mounted?.dispose();
    };
  }, [loadEngine]);

  useEffect(() => {
    handle?.render(buildChartOption(chart, palette, { animate, font: handle.font }));
  }, [handle, chart, palette, animate]);

  // Horizontal rows grow with the number of categories; the design's CSS reads the count.
  const figureStyle: CSSProperties & Record<"--ag-categories", number> = { "--ag-categories": chart.categories.length };

  return (
    <figure className="ag-figure" data-kind={chart.kind} style={figureStyle}>
      <figcaption className="ag-figcaption">{chart.caption}</figcaption>
      {chart.series.length > 1 && (
        <ul className="ag-legend">
          {chart.series.map((series, index) => {
            const swatch: SwatchStyle = { "--ag-swatch": palette.series[index % palette.series.length] ?? palette.accent };

            return (
              <li key={series.name} className="ag-legend-item">
                <span
                  aria-hidden="true"
                  className="ag-swatch"
                  data-shape={series.shape === "line" || chart.kind === "line" ? "line" : "bar"}
                  style={swatch}
                />
                {series.name}
              </li>
            );
          })}
        </ul>
      )}
      <div ref={hostRef} role="img" aria-label={chart.summary} className="ag-plot" data-state={state} />
      <details className="ag-data" open={failed}>
        <summary className="ag-data-toggle">Show data</summary>
        <div className="ag-data-scroll">
          <table className="ag-table">
            <thead>
              <tr>
                <th scope="col">{corner}</th>
                {columns.map((column) => <th key={column} scope="col">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {chart.table.rows.map((row) => {
                const [label, ...cells] = row.cells;

                return (
                  <tr key={row.key}>
                    <th scope="row">{label}</th>
                    {cells.map((cell, index) => <td key={columns[index]}>{cell}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
