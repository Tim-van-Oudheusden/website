import { describe, expect, test } from "bun:test";
import { HOME_SECTIONS } from "./home-sections";

describe("HOME_SECTIONS", () => {
  test("defines the scaffold sections in the expected order", () => {
    const ids = HOME_SECTIONS.map((section) => section.id);
    expect(ids).toEqual([
      "hero",
      "value-pillars",
      "feature-strips",
      "proof",
      "community-and-docs",
      "secondary-cta",
      "footer",
    ]);
  });

  test("uses unique section ids and labels", () => {
    const ids = HOME_SECTIONS.map((section) => section.id);
    const labels = HOME_SECTIONS.map((section) => section.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("every section has a non-empty bgColor", () => {
    for (const section of HOME_SECTIONS) {
      expect(section.bgColor).toBeTruthy();
    }
  });

  test("uses unique background colors", () => {
    const bgColors = HOME_SECTIONS.map((section) => section.bgColor);
    expect(new Set(bgColors).size).toBe(bgColors.length);
  });

  test("every section has a valid contentDirection", () => {
    for (const section of HOME_SECTIONS) {
      expect(["row", "column"]).toContain(section.contentDirection);
    }
  });

  test("uses a mix of row and column content directions", () => {
    const directions = HOME_SECTIONS.map((section) => section.contentDirection);
    expect(directions).toContain("row");
    expect(directions).toContain("column");
  });

  test("sets hero content direction to row for desktop left-to-right composition", () => {
    const hero = HOME_SECTIONS.find((section) => section.id === "hero");
    expect(hero?.contentDirection).toBe("row");
  });
});
