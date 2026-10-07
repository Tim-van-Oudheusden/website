import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

type Rgb = [number, number, number];

interface TextSample {
  text: string;
  color: Rgb;
  backdrop: Rgb;
}

interface SurfaceSample {
  /** What the surface element itself is painted on (its own background included). */
  backdrop: Rgb;
  /** What each `<h3>` inside the surface is painted on. */
  headingBackdrops: Rgb[];
  /** Every visible piece of text inside the surface, with the colour it is painted on. */
  texts: TextSample[];
}

/**
 * Parity with the start section, not full WCAG AA: its own body copy (white/80) reaches about 3.5:1 on the
 * dark well, so text on the other wells must clear 3:1 (the AA ratio for large text).
 */
const WELL_TEXT_CONTRAST_FLOOR = 3;

/** Experience companies with several positions: the ones shown on a panel. */
const EXPERIENCE_PANELS = "section#experience li:has(> ol > li + li)";

/**
 * Samples the colours a surface really shows: every background from the page root down is composited
 * (and text colour on top of that, scaled by opacity) on a 1px canvas, so translucent layers count.
 */
async function sampleSurface(surface: Locator): Promise<SurfaceSample> {
  return surface.evaluate((root): SurfaceSample => {
    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

    if (context === null) {
      throw new Error("No 2D canvas context");
    }

    const ctx: CanvasRenderingContext2D = context;

    function paint(color: string, alpha = 1): void {
      const sentinel = "#010203";

      ctx.fillStyle = sentinel;
      ctx.fillStyle = color;

      if (ctx.fillStyle === sentinel && color !== sentinel) {
        throw new Error(`Canvas cannot parse colour ${color}`);
      }

      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, 1, 1);
      ctx.globalAlpha = 1;
    }

    function pixel(): Rgb {
      const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;

      return [r, g, b];
    }

    /** The element and its ancestors, outermost first. */
    function lineage(element: Element): Element[] {
      const chain: Element[] = [];

      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        chain.unshift(node);
      }

      return chain;
    }

    function paintBackdrop(element: Element): void {
      paint("#ffffff");

      for (const node of lineage(element)) {
        paint(getComputedStyle(node).backgroundColor);
      }
    }

    function backdropOf(element: Element): Rgb {
      paintBackdrop(element);

      return pixel();
    }

    const texts: TextSample[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = node.textContent?.trim() ?? "";

      if (parent === null || text === "" || !parent.checkVisibility()) {
        continue;
      }

      const backdrop = backdropOf(parent);
      const opacity = lineage(parent).reduce((total, element) => total * Number(getComputedStyle(element).opacity), 1);

      paintBackdrop(parent);
      paint(getComputedStyle(parent).color, opacity);
      texts.push({ text, color: pixel(), backdrop });
    }

    return {
      backdrop: backdropOf(root),
      headingBackdrops: [...root.querySelectorAll("h3")].map(backdropOf),
      texts,
    };
  });
}

function relativeLuminance([r, g, b]: Rgb): number {
  function linear(channel: number): number {
    const srgb = channel / 255;

    return srgb <= 0.040_45 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  }

  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

/** Every text in the sample below the contrast floor, as `"text" (ratio:1)`; empty when all are readable. */
function lowContrastTexts(sample: SurfaceSample): string[] {
  return sample.texts
    .map(({ text, color, backdrop }) => ({ text, ratio: contrastRatio(color, backdrop) }))
    .filter(({ ratio }) => ratio < WELL_TEXT_CONTRAST_FLOOR)
    .map(({ text, ratio }) => `"${text}" (${ratio.toFixed(2)}:1)`);
}

/** Asserts every surface's headings sit on the start section's well colour and all its text stays readable. */
async function expectOnWell(page: Page, surfaces: Locator): Promise<void> {
  const wellColor = (await sampleSurface(page.getByTestId("start-white-box"))).backdrop;

  expect(await surfaces.count()).toBeGreaterThan(0);

  for (const surface of await surfaces.all()) {
    const sample = await sampleSurface(surface);

    expect(sample.headingBackdrops.length).toBeGreaterThan(0);

    for (const backdrop of sample.headingBackdrops) {
      expect(backdrop).toEqual(wellColor);
    }

    expect(lowContrastTexts(sample)).toEqual([]);
  }
}

test.describe("Home section surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("centers the experience column, heading and timeline together, in the section", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const section = page.locator("section#experience");
    const sectionBox = await section.boundingBox();
    const headingBox = await section.getByRole("heading", { level: 2, name: "Experience" }).boundingBox();
    const timelineBox = await section.locator("ol").first().boundingBox();

    if (sectionBox === null || headingBox === null || timelineBox === null) {
      throw new Error("Experience section is not laid out");
    }

    const leftGap = timelineBox.x - sectionBox.x;
    const rightGap = sectionBox.x + sectionBox.width - (timelineBox.x + timelineBox.width);

    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
    expect(headingBox.x).toBeCloseTo(timelineBox.x, 0);
  });

  test.describe("in dark mode", () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem("theme", "dark");
      });

      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    });

    test("puts the project cards on the start section's well, with readable text", async ({ page }) => {
      await expect(page.locator("section#for-devs h3").first()).toBeVisible();

      await expectOnWell(page, page.locator("section#for-devs li"));
    });

    test("puts the experience company panels on the start section's well, with readable text", async ({ page }) => {
      await expectOnWell(page, page.locator(EXPERIENCE_PANELS));
    });

    test("keeps role titles on the experience panels readable while hovered or focused", async ({ page }) => {
      // The links skip their colour transition under reduced motion, so a sample shows the settled colour.
      await page.emulateMedia({ reducedMotion: "reduce" });

      const titleLinks = page.locator(`${EXPERIENCE_PANELS} h3 a`);

      expect(await titleLinks.count()).toBeGreaterThan(0);

      for (const link of await titleLinks.all()) {
        await link.hover();
        expect(lowContrastTexts(await sampleSurface(link))).toEqual([]);

        await page.mouse.move(0, 0);
        await link.focus();
        expect(await link.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
        expect(lowContrastTexts(await sampleSurface(link))).toEqual([]);
        await link.blur();
      }
    });
  });
});
