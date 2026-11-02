import type { JSX } from "react";

import type { ModeSegment } from "../../lib/chart-scale";
import { linearScale, modeSegments } from "../../lib/chart-scale";

import { ChartFigure } from "./chart-figure";
import type { ChartTone } from "./chart-tones";
import { toneColor } from "./chart-tones";

export interface ModeStyle {
  label: string;
  tone: ChartTone;
}

interface ModeBandProps<M extends string> {
  caption: string;
  /** Mode per history point, oldest first. */
  history: readonly { t: string; mode: M }[];
  /** Label and colour per mode, in legend order. */
  modes: Readonly<Record<M, ModeStyle>>;
  formatTime: (t: string) => string;
}

const WIDTH = 600;
const HEIGHT = 32;
/** Rough share of the band one label character needs at phone widths, in percent. */
const PERCENT_PER_CHARACTER = 2;

function describeBand<M extends string>(
  segments: readonly ModeSegment<M>[],
  modes: Readonly<Record<M, ModeStyle>>,
  formatTime: (t: string) => string,
): string {
  const first = segments.at(0);
  const latest = segments.at(-1);

  if (first === undefined || latest === undefined) {
    return "no data yet";
  }

  const changes = segments.length - 1;
  const current = `${modes[latest.mode].label} since ${formatTime(latest.from)}`;

  if (changes === 0) {
    return `${current}, no mode changes`;
  }

  return `${current}; ${String(changes)} mode ${changes === 1 ? "change" : "changes"} since ${formatTime(first.from)}`;
}

/**
 * One horizontal band over the history's span, split into segments coloured by mode. A segment runs from its first
 * point to the next segment's first point (the last one to the band's end), and carries its label where it fits.
 */
export function ModeBand<M extends string>({ caption, history, modes, formatTime }: ModeBandProps<M>): JSX.Element {
  const segments = modeSegments(history);
  const first = history.at(0);
  const last = history.at(-1);
  const span = first === undefined || last === undefined
    ? { min: 0, max: 0 }
    : { min: Date.parse(first.t), max: Date.parse(last.t) };
  const toX = linearScale(span, [0, WIDTH]);
  const placed = segments.map((segment, index) => {
    const start = toX(Date.parse(segment.from));
    const next = segments[index + 1];
    const end = next === undefined ? WIDTH : toX(Date.parse(next.from));

    return { ...segment, key: segment.from, start, width: end - start };
  });
  const legend = Object.values<ModeStyle>(modes).map((style) => ({ name: style.label, tone: style.tone }));
  const labelled = placed.filter(
    (segment) => (segment.width / WIDTH) * 100 >= modes[segment.mode].label.length * PERCENT_PER_CHARACTER,
  );

  return (
    <ChartFigure
      caption={caption}
      imageLabel={`${caption}: ${describeBand(segments, modes, formatTime)}`}
      viewBox={{ width: WIDTH, height: HEIGHT }}
      plot="band"
      overlay={(
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {labelled.map((segment) => (
            <span
              key={segment.key}
              className={
                "absolute top-1/2 ml-1 -translate-y-1/2 rounded-sm bg-(--site-section-well-bg) px-1 text-xs "
                + "text-(--ink-4) dark:text-(--paper-2)"
              }
              style={{ left: `${String((segment.start / WIDTH) * 100)}%` }}
            >
              {modes[segment.mode].label}
            </span>
          ))}
        </div>
      )}
      axis={first === undefined || last === undefined ? null : { start: formatTime(first.t), end: formatTime(last.t) }}
      legend={legend}
      table={{
        header: ["Mode", "From", "To"],
        rows: segments.map((segment) => ({
          key: segment.from,
          cells: [modes[segment.mode].label, formatTime(segment.from), formatTime(segment.to)],
        })),
      }}
    >
      {placed.map((segment) => (
        <rect
          key={segment.key}
          x={segment.start}
          y={0}
          width={segment.width}
          height={HEIGHT}
          style={{ fill: toneColor(modes[segment.mode].tone) }}
          className="motion-safe:transition-[x,width] motion-safe:duration-300"
        />
      ))}
    </ChartFigure>
  );
}
