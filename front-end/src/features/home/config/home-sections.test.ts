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
});
