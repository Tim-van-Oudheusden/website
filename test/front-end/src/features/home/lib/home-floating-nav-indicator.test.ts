import { describe, expect, test } from "bun:test";
import { calculateIndicatorMetrics } from "../../../../../../front-end/src/features/home/lib/home-floating-nav-indicator";

describe("calculateIndicatorMetrics", () => {
  test("translates by the active item's offset inside the container", () => {
    const container = { left: 100, top: 200, width: 400, height: 64 };
    const activeItem = { left: 220, top: 210, width: 90, height: 40 };

    expect(calculateIndicatorMetrics(container, activeItem)).toEqual({
      translateX: 120,
      translateY: 10,
      width: 90,
      height: 40,
    });
  });
});
