import { describe, expect, test } from "bun:test";
import { selectActiveSectionId, type ObservedSectionEntry } from "./useActiveHomeSection";
import type { HomeSectionId } from "../types/home-section";

const VALID_SECTION_IDS: readonly HomeSectionId[] = [
  "hero",
  "value-pillars",
  "feature-strips",
  "proof",
  "community-and-docs",
  "secondary-cta",
  "footer",
];

describe("selectActiveSectionId", () => {
  test("keeps current section when no valid intersecting entries are present", () => {
    const entries: ObservedSectionEntry[] = [
      { id: "unknown", isIntersecting: true, intersectionRatio: 0.9 },
      { id: "hero", isIntersecting: false, intersectionRatio: 0.1 },
    ];

    expect(selectActiveSectionId(entries, VALID_SECTION_IDS, "proof")).toBe("proof");
  });

  test("uses the first highest-ratio section when ratios are tied", () => {
    const entries: ObservedSectionEntry[] = [
      { id: "hero", isIntersecting: true, intersectionRatio: 0.8 },
      { id: "value-pillars", isIntersecting: true, intersectionRatio: 0.8 },
    ];

    expect(selectActiveSectionId(entries, VALID_SECTION_IDS, "proof")).toBe("hero");
  });
});
