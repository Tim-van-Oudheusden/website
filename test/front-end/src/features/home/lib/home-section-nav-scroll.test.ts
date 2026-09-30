import { describe, expect, test } from "bun:test";
import { resolveAnchorScrollBehavior } from "../../../../../../front-end/src/features/home/lib/home-section-nav-scroll";

describe("resolveAnchorScrollBehavior", () => {
  test("falls back to auto when matchMedia is unavailable", () => {
    expect(resolveAnchorScrollBehavior(null)).toBe("auto");
  });

  test("uses auto when the user prefers reduced motion", () => {
    const matchMedia = (query: string): { matches: boolean } => ({
      matches: query === "(prefers-reduced-motion: reduce)",
    });

    expect(resolveAnchorScrollBehavior(matchMedia)).toBe("auto");
  });

  test("uses smooth scrolling when reduced motion is not preferred", () => {
    const matchMedia = (): { matches: boolean } => ({ matches: false });

    expect(resolveAnchorScrollBehavior(matchMedia)).toBe("smooth");
  });
});