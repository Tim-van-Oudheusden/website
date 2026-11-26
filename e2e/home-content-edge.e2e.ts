import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { openHome } from "./home-page";

/** Every section with a start-aligned heading; the socials footer centres its heading (home-socials-layout.e2e.ts). */
const SECTION_IDS = ["start", "for-you", "for-devs", "agentic", "whats-new", "experience"] as const;

/** The sections whose heading is the shared home section heading. */
const PLAIN_SECTION_IDS = ["for-you", "for-devs", "whats-new", "experience", "socials"] as const;

/** Left edge of the top bar's logo and of every home section heading, in CSS pixels. */
async function leftEdges(page: Page): Promise<Record<string, number>> {
  return page.evaluate((sectionIds) => {
    function leftOf(element: Element | null, name: string): number {
      if (element === null) {
        throw new Error(`Expected ${name} on the page`);
      }

      return element.getBoundingClientRect().left;
    }

    const edges: Record<string, number> = { logo: leftOf(document.querySelector('header a[href="/"]'), "the logo") };

    for (const id of sectionIds) {
      edges[id] = leftOf(document.getElementById(`${id}-heading`), `the ${id} heading`);
    }

    return edges;
  }, SECTION_IDS);
}

/** The alpha channel of the floating nav's fill, and its backdrop filter. */
async function floatingNavFill(page: Page): Promise<{ alpha: number; backdropFilter: string }> {
  return page.getByRole("navigation", { name: "Page sections" }).getByRole("list").evaluate((list) => {
    const style = getComputedStyle(list);
    const probe = document.createElement("canvas").getContext("2d");

    if (probe === null) {
      throw new Error("Expected a 2D canvas to read colours with");
    }

    // The canvas normalises any CSS colour (oklch, color-mix, ...) to its RGBA pixel.
    probe.fillStyle = style.backgroundColor;
    probe.fillRect(0, 0, 1, 1);

    const [, , , alpha = 0] = probe.getImageData(0, 0, 1, 1).data;

    return { alpha: alpha / 255, backdropFilter: style.backdropFilter };
  });
}

test.describe("Home page content edge and headings", () => {
  for (const width of [1280, 1440, 1920]) {
    test(`starts the logo, the hero text and every section heading on one left edge at ${String(width)}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openHome(page, { theme: "light", content: [] });

      const edges = await leftEdges(page);

      for (const id of SECTION_IDS) {
        expect(Math.abs((edges[id] ?? Number.NaN) - (edges["logo"] ?? Number.NaN)), `${id} heading vs logo`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("sets every plain section heading at 40px with -0.02em tracking and 1.1 leading", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openHome(page, { theme: "light", content: [] });

    for (const id of PLAIN_SECTION_IDS) {
      const type = await page.locator(`#${id}-heading`).evaluate((heading) => {
        const { fontSize, letterSpacing, lineHeight } = getComputedStyle(heading);

        return { fontSize, letterSpacing, lineHeight };
      });

      expect(type, id).toEqual({ fontSize: "40px", letterSpacing: "-0.8px", lineHeight: "44px" });
    }
  });

  test("makes the hero heading the page's only h1", async ({ page }) => {
    await openHome(page, { theme: "light", content: [] });

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build with Tim.");
  });
});

test.describe("Home floating nav fill", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`lets the content beneath blur through in ${theme} mode, and turns opaque when transparency is reduced`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openHome(page, { theme, content: [] });

      const translucent = await floatingNavFill(page);

      expect(translucent.alpha).toBeLessThan(1);
      expect(translucent.backdropFilter).toContain("blur(");

      // Playwright has no option for this media feature; Chromium's DevTools protocol emulates it.
      const session = await page.context().newCDPSession(page);

      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
      });

      expect((await floatingNavFill(page)).alpha).toBe(1);
    });
  }
});
