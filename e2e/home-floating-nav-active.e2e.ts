import type { Page } from "@playwright/test";

import { HOME_SECTIONS } from "../front-end/src/features/home/config/home-sections";

import { expect, test } from "./fixtures";
import { openHome } from "./home-page";

const SECTION_IDS = HOME_SECTIONS.map((section) => section.id);

/**
 * The floating nav's current item, by the section id its link points at. Read from the DOM, not the accessibility
 * tree: below `sm` the nav is hidden, but it keeps its state for when the window widens.
 */
async function currentNavSection(page: Page): Promise<string | null> {
  const href = await page.locator("nav[aria-label='Page sections'] a[aria-current]").getAttribute("href");

  return href?.replace(/^#/, "") ?? null;
}

/** Scrolls the page top to bottom and lists the sections the nav marks current, in the order they became current. */
async function currentSectionsWhileScrolling(page: Page): Promise<string[]> {
  const seen: string[] = [];
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  for (let top = 0; top <= scrollHeight; top += 100) {
    await page.evaluate(async (y) => {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, top);

    const current = await currentNavSection(page);

    if (current !== null && seen.at(-1) !== current) {
      seen.push(current);
    }
  }

  return seen;
}

/** Opens the home page with its real content, so every section has its loaded height. */
async function openLoadedHome(page: Page): Promise<void> {
  await openHome(page, { theme: "light", content: ["article", "project"] });
  await expect(page.locator("#whats-new a[href^='/articles/']").first()).toBeVisible();
  await expect(page.locator("#for-devs a[href^='/projects/']").first()).toBeVisible();
}

test.describe("Home floating nav: current section", () => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    test(`at ${viewport.width}x${viewport.height}, scrolling top to bottom makes every section current, in order`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openLoadedHome(page);

      expect(await currentSectionsWhileScrolling(page)).toEqual(SECTION_IDS);
    });
  }

  test("on a desktop, jumping to a section from the nav makes it current", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLoadedHome(page);

    const nav = page.getByRole("navigation", { name: "Page sections" });

    for (const id of [...SECTION_IDS].reverse()) {
      await nav.locator(`a[href="#${id}"]`).click();
      await expect(nav.locator(`a[href="#${id}"]`)).toHaveAttribute("aria-current", "location");
    }
  });
});
