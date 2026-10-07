import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { openHome } from "./home-page";
import { AA_NON_TEXT_CONTRAST, contrastRatio, lowContrastTexts, sampleSurface } from "./surface-colours";

/** Experience companies with several positions: the ones shown on a panel. */
const EXPERIENCE_PANELS = "section#experience li:has(> ol > li + li)";

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

/** Asserts all text inside each surface meets WCAG AA against what it is painted on. */
async function expectReadable(surfaces: Locator): Promise<void> {
  expect(await surfaces.count()).toBeGreaterThan(0);

  for (const surface of await surfaces.all()) {
    expect(lowContrastTexts(await sampleSurface(surface))).toEqual([]);
  }
}

test.describe("Home section surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("centers the experience column, heading and timeline together, in the section", async ({ page }) => {
    await openHome(page, { theme: "light", content: [] });

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
    test("puts the project cards on the start section's well, with readable text", async ({ page }) => {
      await openHome(page, { theme: "dark", content: ["project"] });
      await expect(page.locator("section#for-devs h3").first()).toBeVisible();

      await expectOnWell(page, page.locator("section#for-devs li"));
    });

    test("puts the experience company panels on the start section's well, with readable text", async ({ page }) => {
      await openHome(page, { theme: "dark", content: [] });

      await expectOnWell(page, page.locator(EXPERIENCE_PANELS));
    });

    test("keeps all text on the other home wells at WCAG AA contrast", async ({ page }) => {
      await openHome(page, { theme: "dark", content: ["article"] });
      await expect(page.locator("section#whats-new li a").first()).toBeVisible();

      await expectReadable(page.getByTestId("start-white-box"));
      await expectReadable(page.locator("section#about-me ul"));
      await expectReadable(page.locator("section#whats-new li a"));
      await expectReadable(page.getByRole("navigation", { name: "Page sections" }).locator("ul"));
    });

    test("keeps role titles on the experience panels readable while hovered or focused", async ({ page }) => {
      await openHome(page, { theme: "dark", content: [] });

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

    test("draws the default focus outline at WCAG AA non-text contrast on the well", async ({ page }) => {
      await openHome(page, { theme: "dark", content: [] });

      // The floating nav sits on the well in dark mode and keeps the site-wide default focus outline.
      const navLink = page.getByRole("navigation", { name: "Page sections" }).getByRole("link").first();

      await navLink.focus();
      expect(await navLink.evaluate((element) => element.matches(":focus-visible"))).toBe(true);

      const { outline, surround } = await sampleSurface(navLink);

      expect(contrastRatio(outline, surround)).toBeGreaterThanOrEqual(AA_NON_TEXT_CONTRAST);
    });
  });
});
