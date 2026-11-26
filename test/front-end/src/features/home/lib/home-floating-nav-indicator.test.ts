import { describe, expect, test } from "bun:test";

import {
  calculateIndicatorInsets,
  indicatorClipPath,
} from "../../../../../../front-end/src/features/home/lib/home-floating-nav-indicator";

/** A 400x64 padding box inside a 1px border, its border box at (100, 200). */
const container = {
  left: 100,
  top: 200,
  width: 402,
  height: 66,
  clientLeft: 1,
  clientTop: 1,
  clientWidth: 400,
  clientHeight: 64,
  offsetWidth: 402,
  offsetHeight: 66,
};

describe("calculateIndicatorInsets", () => {
  test("insets the active item's box from each edge of the container's padding box", () => {
    const activeItem = { left: 221, top: 213, width: 90, height: 40 };

    expect(calculateIndicatorInsets(container, activeItem)).toEqual({
      top: 12,
      right: 190,
      bottom: 12,
      left: 120,
    });
  });

  test("puts an item flush against the padding box at zero insets, not one border width in", () => {
    const activeItem = { left: 101, top: 201, width: 400, height: 64 };

    expect(calculateIndicatorInsets(container, activeItem)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  test("keeps the fractional part of the padding box that clientWidth and clientHeight round away", () => {
    // A 402.4x66.25 border box: clientWidth/clientHeight (400x64) and offsetWidth/offsetHeight (402x66) are rounded.
    const fractional = { ...container, width: 402.4, height: 66.25 };
    const activeItem = { left: 221, top: 213, width: 90, height: 40 };

    const insets = calculateIndicatorInsets(fractional, activeItem);

    expect(insets.right).toBeCloseTo(190.4, 6);
    expect(insets.bottom).toBeCloseTo(12.25, 6);
  });
});

describe("indicatorClipPath", () => {
  test("clips to the insets as a fully rounded pill", () => {
    expect(indicatorClipPath({ top: 12, right: 190.5, bottom: 12, left: 120.25 })).toBe(
      "inset(12px 190.5px 12px 120.25px round 9999px)",
    );
  });
});
