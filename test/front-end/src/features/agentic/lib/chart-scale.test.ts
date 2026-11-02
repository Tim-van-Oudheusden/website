import { describe, expect, test } from "bun:test";

import { linearScale, modeSegments, niceDomain, seriesPoints, stackOffsets } from "../../../../../../front-end/src/features/agentic/lib/chart-scale";

describe("niceDomain", () => {
  test("starts at zero and rounds the top up to 1, 2 or 5 times a power of ten", () => {
    expect(niceDomain([4, 9, 6])).toEqual({ min: 0, max: 10 });
    expect(niceDomain([181])).toEqual({ min: 0, max: 200 });
    expect(niceDomain([0.4])).toEqual({ min: 0, max: 0.5 });
    expect(niceDomain([20])).toEqual({ min: 0, max: 20 });
  });

  test("gives a usable domain for empty and all-zero series", () => {
    expect(niceDomain([])).toEqual({ min: 0, max: 1 });
    expect(niceDomain([0, 0, 0])).toEqual({ min: 0, max: 1 });
  });

  test("rejects negative and non-finite values", () => {
    expect(() => niceDomain([3, -1])).toThrow(RangeError);
    expect(() => niceDomain([Number.NaN])).toThrow(RangeError);
    expect(() => niceDomain([Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });
});

describe("linearScale", () => {
  test("maps the domain onto the range, inverted ranges included", () => {
    const toY = linearScale({ min: 0, max: 10 }, [100, 0]);

    expect(toY(0)).toBe(100);
    expect(toY(5)).toBe(50);
    expect(toY(10)).toBe(0);
  });

  test("maps everything to the range start when the domain has no width", () => {
    const toX = linearScale({ min: 7, max: 7 }, [0, 600]);

    expect(toX(7)).toBe(0);
  });
});

describe("seriesPoints", () => {
  const box = { width: 600, height: 200 };

  test("spreads points evenly from the left edge to the right edge", () => {
    expect(seriesPoints([0, 5, 10], { ...box, domain: { min: 0, max: 10 } })).toEqual([
      { x: 0, y: 200 },
      { x: 300, y: 100 },
      { x: 600, y: 0 },
    ]);
  });

  test("returns no points for an empty series and one point at the right edge for a single value", () => {
    expect(seriesPoints([], { ...box, domain: niceDomain([]) })).toEqual([]);
    expect(seriesPoints([4], { ...box, domain: niceDomain([4]) })).toEqual([{ x: 600, y: 40 }]);
  });

  test("draws an all-zero series as a flat line on the baseline", () => {
    const points = seriesPoints([0, 0, 0], { ...box, domain: niceDomain([0, 0, 0]) });

    expect(points.map((point) => point.y)).toEqual([200, 200, 200]);
    expect(points.every((point) => Number.isFinite(point.x))).toBe(true);
  });

  test("rejects negative values", () => {
    expect(() => seriesPoints([1, -2], { ...box, domain: { min: 0, max: 10 } })).toThrow(RangeError);
  });
});

describe("modeSegments", () => {
  test("merges consecutive equal modes into segments that span their first to last t", () => {
    const history = [
      { t: "2026-11-02T00:00:00Z", mode: "quiet" },
      { t: "2026-11-02T00:05:00Z", mode: "quiet" },
      { t: "2026-11-02T00:10:00Z", mode: "busy" },
      { t: "2026-11-02T00:15:00Z", mode: "quiet" },
      { t: "2026-11-02T00:20:00Z", mode: "busy" },
      { t: "2026-11-02T00:25:00Z", mode: "busy" },
      { t: "2026-11-02T00:30:00Z", mode: "busy" },
    ] as const;

    expect(modeSegments(history)).toEqual([
      { mode: "quiet", from: "2026-11-02T00:00:00Z", to: "2026-11-02T00:05:00Z" },
      { mode: "busy", from: "2026-11-02T00:10:00Z", to: "2026-11-02T00:10:00Z" },
      { mode: "quiet", from: "2026-11-02T00:15:00Z", to: "2026-11-02T00:15:00Z" },
      { mode: "busy", from: "2026-11-02T00:20:00Z", to: "2026-11-02T00:30:00Z" },
    ]);
  });

  test("returns no segments for an empty history", () => {
    expect(modeSegments([])).toEqual([]);
  });
});

describe("stackOffsets", () => {
  test("gives each value the running total of the values before it", () => {
    expect(stackOffsets([62, 9, 4])).toEqual([0, 62, 71]);
    expect(stackOffsets([])).toEqual([]);
  });

  test("rejects negative values", () => {
    expect(() => stackOffsets([1, -1])).toThrow(RangeError);
  });
});
