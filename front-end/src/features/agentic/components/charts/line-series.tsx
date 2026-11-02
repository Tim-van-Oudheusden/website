import type { JSX } from "react";

import { niceDomain, seriesPoints } from "../../lib/chart-scale";

import type { ChartSeries } from "./chart-figure";
import { ChartFigure, formatValue } from "./chart-figure";
import { toneColor } from "./chart-tones";

export interface LineSeriesProps {
  caption: string;
  /** Header of the data table's first column, e.g. "Time". */
  xHeader: string;
  /** One label per point, oldest first; the first and last also label the plot's edges. */
  xLabels: readonly string[];
  /** Every series has one value per `xLabels` entry. */
  series: readonly ChartSeries[];
}

const WIDTH = 600;
const HEIGHT = 200;

function describeSeries({ name, values }: ChartSeries): string {
  const latest = formatValue(values.at(-1) ?? 0);

  if (values.length === 1) {
    return `${name} now ${latest}`;
  }

  const lowest = Math.min(...values);
  const highest = Math.max(...values);

  return lowest === highest
    ? `${name} steady at ${latest}`
    : `${name} between ${formatValue(lowest)} and ${formatValue(highest)}, now ${latest}`;
}

/** Lines over time, one per series, on a shared zero-based axis. */
export function LineSeries({ caption, xHeader, xLabels, series }: LineSeriesProps): JSX.Element {
  const domain = niceDomain(series.flatMap((entry) => entry.values));
  const withData = series.filter((entry) => entry.values.length > 0);
  const summary = withData.length === 0 ? "no data yet" : withData.map(describeSeries).join("; ");
  const first = xLabels.at(0);
  const last = xLabels.at(-1);

  return (
    <ChartFigure
      caption={caption}
      imageLabel={`${caption}: ${summary}`}
      viewBox={{ width: WIDTH, height: HEIGHT }}
      plot="area"
      overlay={null}
      axis={first !== undefined && last !== undefined && xLabels.length > 1 ? { start: first, end: last } : null}
      legend={series}
      table={{
        header: [xHeader, ...series.map((entry) => entry.name)],
        rows: xLabels.map((label, index) => ({
          key: String(index),
          cells: [label, ...series.map((entry) => formatValue(entry.values[index] ?? 0))],
        })),
      }}
    >
      <line x1={0} x2={WIDTH} y1={HEIGHT} y2={HEIGHT} stroke="currentColor" vectorEffect="non-scaling-stroke" className="text-(--paper-3) dark:text-(--ink-3)" />
      {series.map((entry) => {
        const [start, ...rest] = seriesPoints(entry.values, { width: WIDTH, height: HEIGHT, domain });

        if (start === undefined) {
          return null;
        }

        // A lone point is a zero-length segment, which round caps draw as a dot.
        const path = [start, ...(rest.length > 0 ? rest : [start])]
          .map((point, index) => `${index === 0 ? "M" : "L"}${String(point.x)},${String(point.y)}`)
          .join(" ");

        return (
          <path
            key={entry.name}
            d={path}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: toneColor(entry.tone) }}
            className="motion-safe:transition-[d] motion-safe:duration-300"
          />
        );
      })}
    </ChartFigure>
  );
}
