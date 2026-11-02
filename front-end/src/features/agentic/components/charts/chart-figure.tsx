import type { JSX, ReactNode } from "react";

import type { ChartTone } from "./chart-tones";
import { toneColor } from "./chart-tones";

/** One named series of non-negative values, oldest first. */
export interface ChartSeries {
  name: string;
  tone: ChartTone;
  values: readonly number[];
}

export interface LegendEntry {
  name: string;
  tone: ChartTone;
}

/** One "Show data" row; `key` is unique within the table, since row labels can repeat (two "busy" segments). */
export interface ChartTableRow {
  key: string;
  /** One cell per header column; the first names the row. */
  cells: readonly string[];
}

/** The "Show data" table: a header row of unique column names, then the rows. */
export interface ChartTable {
  header: readonly string[];
  rows: readonly ChartTableRow[];
}

interface ChartFigureProps {
  caption: string;
  /** The SVG's `aria-label`: the takeaway, computed from the data. */
  imageLabel: string;
  /** SVG user units; the plot stretches to the figure's width and the height `plot` gives it. */
  viewBox: { width: number; height: number };
  plot: "band" | "area";
  /** HTML laid over the plot (e.g. segment labels), positioned in percent; `null` for none. */
  overlay: ReactNode;
  /** Labels under the plot's left and right edges; `null` for none. */
  axis: { start: string; end: string } | null;
  legend: readonly LegendEntry[];
  table: ChartTable;
  /** SVG content drawn in `viewBox` units. */
  children: ReactNode;
}

const PLOT_HEIGHT = { band: "h-8", area: "h-40" } as const;

const NUMBER_FORMAT = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** Formats a chart value for labels and tables: grouped thousands, at most one decimal. */
export function formatValue(value: number): string {
  return NUMBER_FORMAT.format(value);
}

/**
 * The frame every chart shares: a `<figure>` with a `<figcaption>`, the plot as an inline `<svg role="img">` with a
 * data-derived `aria-label`, a legend that names every series (colour is never the only cue) and a "Show data"
 * table with every value. The plot stretches to the width of its container.
 */
export function ChartFigure({
  caption,
  imageLabel,
  viewBox,
  plot,
  overlay,
  axis,
  legend,
  table,
  children,
}: ChartFigureProps): JSX.Element {
  const [headerCorner, ...headerCells] = table.header;

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-base font-medium text-(--ink-4) dark:text-(--paper-2)">{caption}</figcaption>
      <div className="relative">
        <svg
          role="img"
          aria-label={imageLabel}
          viewBox={`0 0 ${String(viewBox.width)} ${String(viewBox.height)}`}
          width="100%"
          preserveAspectRatio="none"
          className={`block overflow-visible ${PLOT_HEIGHT[plot]}`}
        >
          {children}
        </svg>
        {overlay}
      </div>
      {axis && (
        <div className="flex justify-between text-sm text-(--ink-2) dark:text-(--paper-4)">
          <span>{axis.start}</span>
          <span>{axis.end}</span>
        </div>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-(--ink-3) dark:text-(--paper-3)">
        {legend.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ backgroundColor: toneColor(entry.tone) }} />
            {entry.name}
          </li>
        ))}
      </ul>
      <details className="text-sm text-(--ink-3) dark:text-(--paper-3)">
        <summary className="w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--site-accent)">
          Show data
        </summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full border-collapse text-left tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">{headerCorner}</th>
                {headerCells.map((cell) => (
                  <th key={cell} scope="col" className="py-1 pr-4 font-medium">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => {
                const [rowHeader, ...cells] = row.cells;

                return (
                  <tr key={row.key} className="border-t border-(--paper-3) dark:border-(--ink-3)">
                    <th scope="row" className="py-1 pr-4 font-normal">{rowHeader}</th>
                    {cells.map((cell, cellIndex) => (
                      <td key={headerCells[cellIndex]} className="py-1 pr-4">{cell}</td>
                    ))}
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
