import { describe, expect, test } from "bun:test";
import { selectActiveSectionId, type ObservedSectionEntry } from "../../../../../../front-end/src/features/home/hooks/use-active-home-section";
import type { HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";

const VALID_IDS: readonly HomeSectionId[] = ["start", "for-you", "footer"];

function entry(id: string, ratio: number, isIntersecting = true): ObservedSectionEntry {
  return { id, intersectionRatio: ratio, isIntersecting };
}

describe("selectActiveSectionId", () => {
  test("selects the highest-ratio intersecting valid section", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.2), entry("for-you", 0.8)], VALID_IDS, "start",
    )).toBe("for-you");
  });

  test("ignores non-intersecting entries", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.9, false), entry("for-you", 0.5)], VALID_IDS, "start",
    )).toBe("for-you");
  });

  test("ignores ids outside the valid section set", () => {
    expect(selectActiveSectionId(
      [entry("unknown", 1), entry("start", 0.3)], VALID_IDS, "for-you",
    )).toBe("start");
  });

  test("keeps the current section when no entry competes", () => {
    expect(selectActiveSectionId([], VALID_IDS, "for-you")).toBe("for-you");
    expect(selectActiveSectionId(
      [entry("start", 0, true)], VALID_IDS, "for-you",
    )).toBe("for-you");
  });

  test("prefers the first strictly greater ratio on ties", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.5), entry("for-you", 0.5)], VALID_IDS, "footer",
    )).toBe("start");
  });
});