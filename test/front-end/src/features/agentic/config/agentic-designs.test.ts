import { describe, expect, test } from "bun:test";

import {
  AGENTIC_DESIGNS,
  designPalette,
  resolveDesign,
} from "../../../../../../front-end/src/features/agentic/config/agentic-designs";
import { contrastRatio, FLEXOKI_SURFACES } from "../../../../../../front-end/src/features/agentic/lib/flexoki";

describe("resolveDesign", () => {
  test("picks the design a ?design= slug names", () => {
    for (const design of AGENTIC_DESIGNS) {
      expect(resolveDesign(design.slug)).toBe(design);
    }
  });

  test("falls back to the first design for a missing, unknown or differently cased slug", () => {
    const [first] = AGENTIC_DESIGNS;

    for (const slug of [null, "", "canyon", "Blueprint", " blueprint"]) {
      expect(resolveDesign(slug)).toBe(first!);
    }
  });
});

describe("AGENTIC_DESIGNS", () => {
  test("offers ten designs, each under its own URL-safe slug and name", () => {
    expect(AGENTIC_DESIGNS).toHaveLength(10);
    expect(new Set(AGENTIC_DESIGNS.map((design) => design.slug)).size).toBe(10);
    expect(new Set(AGENTIC_DESIGNS.map((design) => design.name)).size).toBe(10);

    for (const design of AGENTIC_DESIGNS) {
      expect(design.slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    }
  });
});

describe("designPalette", () => {
  test("draws every graph colour at 3:1 or more on each Flexoki surface of its theme (WCAG 1.4.11)", () => {
    for (const design of AGENTIC_DESIGNS) {
      for (const theme of ["light", "dark"] as const) {
        const palette = designPalette(design, theme);

        for (const surface of FLEXOKI_SURFACES[theme]) {
          for (const colour of [palette.accent, ...palette.series]) {
            expect({ design: design.slug, theme, surface, colour, ratio: contrastRatio(colour, surface) >= 3 })
              .toEqual({ design: design.slug, theme, surface, colour, ratio: true });
          }
        }
      }
    }
  });

  test("leads every graph with the design's accent and gives each series its own colour", () => {
    for (const design of AGENTIC_DESIGNS) {
      for (const theme of ["light", "dark"] as const) {
        const palette = designPalette(design, theme);

        expect(palette.series[0]).toBe(palette.accent);
        expect(new Set(palette.series).size).toBe(palette.series.length);
      }
    }
  });

  test("keeps text at 4.5:1 or more on each Flexoki surface of its theme", () => {
    for (const design of AGENTIC_DESIGNS) {
      for (const theme of ["light", "dark"] as const) {
        const palette = designPalette(design, theme);

        for (const surface of FLEXOKI_SURFACES[theme]) {
          expect(contrastRatio(palette.ink, surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(palette.muted, surface)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe("contrastRatio", () => {
  test("measures WCAG relative-luminance contrast, in either order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    // Flexoki yellow-600 on white, as BRANDING.md quotes it: 3.5:1.
    expect(contrastRatio("#ad8301", "#ffffff")).toBeCloseTo(3.5, 1);
  });
});
