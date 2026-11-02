import type { JSX } from "react";

import { linearScale, niceDomain, stackOffsets } from "../../lib/chart-scale";

import type { ChartSeries } from "./chart-figure";
import { ChartFigure, formatValue } from "./chart-figure";
import { toneColor } from "./chart-tones";

/**
 * - `grouped`: side by side per label; with one series this is a plain bar chart.
 * - `stacked`: on top of each other, on an axis that fits the largest total.
 * - `percent`: stacked to a full-height (100 %) bar per label, split by each series' share.
 */
export type BarLayout = "grouped" | "stacked" | "percent";

export interface BarSeriesProps {
  caption: string;
  /** Header of the data table's first column, e.g. "Day". */
  xHeader: string;
  /** One label per bar position, oldest first; the first and last also label the plot's edges. */
  xLabels: readonly string[];
  /** Every series has one value per `xLabels` entry. */
  series: readonly ChartSeries[];
  layout: BarLayout;
}

interface Bar {
  key: string;
  series: ChartSeries;
  x: number;
  y: number;
  width: number;
  height: number;
}

const WIDTH = 600;
const HEIGHT = 200;
/** Share of each label's slot the bars fill; the rest is the gap between slots. */
const BAR_FILL = 0.8;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function describeTotals(series: readonly ChartSeries[], xLabels: readonly string[]): string {
  return series
    .map(({ name, values }) => {
      const total = sum(values);

      if (total === 0) {
        return `${name} none`;
      }

      const peak = Math.max(...values);

      return `${name} ${formatValue(total)} in total, most ${formatValue(peak)} (${xLabels[values.indexOf(peak)] ?? ""})`;
    })
    .join("; ");
}

function describeShares(series: readonly ChartSeries[]): string {
  const whole = formatValue(sum(series.map((entry) => sum(entry.values))));

  return series.map(({ name, values }) => `${name} ${formatValue(sum(values))} of ${whole}`).join("; ");
}

function layoutBars(series: readonly ChartSeries[], count: number, layout: BarLayout): Bar[] {
  const slot = WIDTH / count;
  const gap = slot * (1 - BAR_FILL) / 2;
  // A series shorter than the labels counts as 0 where it has no value.
  const columns = Array.from({ length: count }, (_, index) => series.map((entry) => entry.values[index] ?? 0));

  if (layout === "grouped") {
    const toHeight = linearScale(niceDomain(series.flatMap((entry) => entry.values)), [0, HEIGHT]);
    const barWidth = (slot * BAR_FILL) / series.length;

    return columns.flatMap((column, index) =>
      series.map((entry, seriesIndex) => {
        const height = toHeight(column[seriesIndex] ?? 0);

        return {
          key: `${entry.name}-${String(index)}`,
          series: entry,
          x: (index * slot) + gap + (seriesIndex * barWidth),
          y: HEIGHT - height,
          width: barWidth,
          height,
        };
      }));
  }

  const domain = niceDomain(columns.map(sum));

  return columns.flatMap((column, index) => {
    const total = sum(column);
    const toHeight = layout === "percent"
      ? linearScale({ min: 0, max: total }, [0, total === 0 ? 0 : HEIGHT])
      : linearScale(domain, [0, HEIGHT]);
    const offsets = stackOffsets(column);

    return series.map((entry, seriesIndex) => {
      const height = toHeight(column[seriesIndex] ?? 0);

      return {
        key: `${entry.name}-${String(index)}`,
        series: entry,
        x: (index * slot) + gap,
        y: HEIGHT - toHeight(offsets[seriesIndex] ?? 0) - height,
        width: slot * BAR_FILL,
        height,
      };
    });
  });
}

/** Vertical bars per label: plain or grouped, stacked, or stacked to 100 %. */
export function BarSeries({ caption, xHeader, xLabels, series, layout }: BarSeriesProps): JSX.Element {
  const hasData = xLabels.length > 0 && (layout !== "percent" || series.some((entry) => sum(entry.values) > 0));
  let summary = "no data yet";

  if (hasData) {
    summary = layout === "percent" ? describeShares(series) : describeTotals(series, xLabels);
  }

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
      {xLabels.length > 0
        && layoutBars(series, xLabels.length, layout).map((bar) => (
          <rect
            key={bar.key}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            style={{ fill: toneColor(bar.series.tone) }}
            className="motion-safe:transition-[y,height] motion-safe:duration-300"
          />
        ))}
    </ChartFigure>
  );
}
