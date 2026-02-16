import { describe, expect, test } from "bun:test";
import { calculateIndicatorMetrics } from "./home-floating-nav-indicator";

describe("calculateIndicatorMetrics", () => {
  test("returns x/y offsets and size relative to the nav container", () => {
    const metrics = calculateIndicatorMetrics(
      { left: 100, top: 200, width: 400, height: 64 },
      { left: 148, top: 212, width: 120, height: 36 },
    );

    expect(metrics.translateX).toBe(48);
    expect(metrics.translateY).toBe(12);
    expect(metrics.width).toBe(120);
    expect(metrics.height).toBe(36);
  });
});
