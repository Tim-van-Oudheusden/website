import type { JSX } from "react";

import { linearScale, stackOffsets } from "../../lib/chart-scale";

import { ChartFigure, formatValue } from "./chart-figure";
import type { ChartTone } from "./chart-tones";
import { toneColor } from "./chart-tones";

export interface StackedRowPart {
  name: string;
  tone: ChartTone;
  value: number;
}

export interface StackedRowProps {
  caption: string;
  /** Header of the data table's first column, e.g. "Outcome". */
  partHeader: string;
  parts: readonly StackedRowPart[];
}

const WIDTH = 600;
const HEIGHT = 32;

const SHARE_FORMAT = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });

/** One horizontal bar split into its parts, each as wide as its share of the total. */
export function StackedRow({ caption, partHeader, parts }: StackedRowProps): JSX.Element {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const toWidth = linearScale({ min: 0, max: total }, [0, total === 0 ? 0 : WIDTH]);
  const summary = total === 0
    ? "none yet"
    : `${formatValue(total)} in total, ${parts.map((part) => `${formatValue(part.value)} ${part.name}`).join(", ")}`;
  const offsets = stackOffsets(parts.map((part) => part.value));

  return (
    <ChartFigure
      caption={caption}
      imageLabel={`${caption}: ${summary}`}
      viewBox={{ width: WIDTH, height: HEIGHT }}
      plot="band"
      overlay={null}
      axis={null}
      legend={parts}
      table={{
        header: [partHeader, "Count", "Share"],
        rows: parts.map((part) => ({
          key: part.name,
          cells: [part.name, formatValue(part.value), SHARE_FORMAT.format(total === 0 ? 0 : part.value / total)],
        })),
      }}
    >
      {parts.map((part, index) => (
        <rect
          key={part.name}
          x={toWidth(offsets[index] ?? 0)}
          y={0}
          width={toWidth(part.value)}
          height={HEIGHT}
          style={{ fill: toneColor(part.tone) }}
          className="motion-safe:transition-[x,width] motion-safe:duration-300"
        />
      ))}
    </ChartFigure>
  );
}
