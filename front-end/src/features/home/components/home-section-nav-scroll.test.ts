import { describe, expect, test } from "bun:test";
import { resolveAnchorScrollBehavior } from "./home-section-nav-scroll";

describe("resolveAnchorScrollBehavior", () => {
  test("returns auto when matchMedia is unavailable", () => {
    expect(resolveAnchorScrollBehavior(null)).toBe("auto");
  });

  test("returns auto when reduced motion is preferred", () => {
    const matchMedia = (): { matches: boolean } => ({ matches: true });
    expect(resolveAnchorScrollBehavior(matchMedia)).toBe("auto");
  });

  test("returns smooth when reduced motion is not preferred", () => {
    const matchMedia = (): { matches: boolean } => ({ matches: false });
    expect(resolveAnchorScrollBehavior(matchMedia)).toBe("smooth");
  });
});
