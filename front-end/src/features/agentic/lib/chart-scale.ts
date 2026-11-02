/** Value range a chart axis covers. */
export interface Domain {
  min: number;
  max: number;
}

const NICE_STEPS = [1, 2, 5, 10] as const;

function assertCounts(values: readonly number[]): void {
  for (const value of values) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`Chart values must be finite and not negative, got ${String(value)}`);
    }
  }
}

function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= value) ?? 10;

  return step * magnitude;
}

/**
 * Domain for a series of counts: the baseline is always 0, so bars and lines read honestly, and the top is the
 * largest value rounded up to 1, 2 or 5 times a power of ten. Empty and all-zero series get `0..1`, so scaling
 * never divides by zero. Negative or non-finite values throw a `RangeError`.
 */
export function niceDomain(values: readonly number[]): Domain {
  assertCounts(values);
  const largest = Math.max(0, ...values);

  return { min: 0, max: largest === 0 ? 1 : niceCeil(largest) };
}

/** Maps `domain` linearly onto `range`; a domain with no width maps every value to the range start. */
export function linearScale(domain: Domain, range: readonly [number, number]): (value: number) => number {
  const [start, end] = range;
  const width = domain.max - domain.min;

  return (value) => (width === 0 ? start : start + ((value - domain.min) / width) * (end - start));
}

/** A point in SVG user units (y grows downwards). */
export interface Point {
  x: number;
  y: number;
}

export interface PlotBox {
  width: number;
  height: number;
  domain: Domain;
}

/**
 * Points of a line through `values`, spread evenly from the left edge to the right edge of `box`, with the domain's
 * minimum on the bottom edge. A single value sits on the right edge ("now").
 */
export function seriesPoints(values: readonly number[], box: PlotBox): Point[] {
  assertCounts(values);
  const toY = linearScale(box.domain, [box.height, 0]);
  const toX = linearScale({ min: 0, max: values.length - 1 }, [values.length === 1 ? box.width : 0, box.width]);

  return values.map((value, index) => ({ x: toX(index), y: toY(value) }));
}

/** Where each value starts when the values are stacked end to end: the running total of the values before it. */
export function stackOffsets(values: readonly number[]): number[] {
  assertCounts(values);

  return values.map((_, index) => values.slice(0, index).reduce((total, value) => total + value, 0));
}

/** A run of equal modes, from the first to the last history point of the run. */
export interface ModeSegment<M extends string> {
  mode: M;
  from: string;
  to: string;
}

/** Merges consecutive history points with the same mode into segments, oldest first. */
export function modeSegments<M extends string>(history: readonly { t: string; mode: M }[]): ModeSegment<M>[] {
  const segments: ModeSegment<M>[] = [];

  for (const point of history) {
    const last = segments.at(-1);

    if (last?.mode === point.mode) {
      last.to = point.t;
    } else {
      segments.push({ mode: point.mode, from: point.t, to: point.t });
    }
  }

  return segments;
}
