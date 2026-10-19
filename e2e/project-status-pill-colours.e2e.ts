import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { AA_NON_TEXT_CONTRAST, contrastRatio, lowContrastTexts, sampleSurface } from "./surface-colours";

/** The status pill is visible against what it sits on, readable, and filled differently from the tag pills. */
async function expectStatusPillStandsOut(statusPill: Locator, tagPill: Locator): Promise<void> {
  await expect(statusPill).toBeVisible();
  await expect(tagPill).toBeVisible();

  const status = await sampleSurface(statusPill);
  const tag = await sampleSurface(tagPill);

  expect(contrastRatio(status.backdrop, status.surround)).toBeGreaterThanOrEqual(AA_NON_TEXT_CONTRAST);
  expect(lowContrastTexts(status)).toEqual([]);
  expect(status.backdrop).not.toEqual(tag.backdrop);
}

async function expectTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  const html = page.locator("html");

  await (theme === "dark" ? expect(html).toHaveClass(/\bdark\b/) : expect(html).not.toHaveClass(/\bdark\b/));
}

// Statuses and tags come from the project entries in content/.
const PROJECT_CARDS = [
  { title: "Minimal Android Launcher", status: "In Progress", tag: "Android" },
  { title: "Dailies", status: "In Progress", tag: "Linux" },
  { title: "Obsidian Content Pipeline", status: "Shipped", tag: "Obsidian" },
] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`Project status pill colours (${theme} mode)`, () => {
    test.beforeEach(async ({ page }) => {
      // Images never change a pill's colour; skip them.
      await page.route((url) => url.pathname.startsWith("/content-assets/"), async (route) => route.abort());

      await page.addInitScript((storedTheme) => {
        localStorage.setItem("theme", storedTheme);
      }, theme);
    });

    test("status pills on the project cards stand out from the card", async ({ page }) => {
      await page.goto("/projects", { waitUntil: "domcontentloaded" });

      for (const { title, status, tag } of PROJECT_CARDS) {
        const card = page.getByRole("link", { name: new RegExp(title) });

        await expectStatusPillStandsOut(card.getByText(status, { exact: true }), card.getByText(tag, { exact: true }));
      }

      await expectTheme(page, theme);
    });

    test("the status pill on a project page stands out from the page", async ({ page }) => {
      await page.goto("/projects/dailies", { waitUntil: "domcontentloaded" });

      const header = page.getByRole("article").locator("header");

      await expectStatusPillStandsOut(header.getByText("In Progress", { exact: true }), header.getByText("Linux", { exact: true }));
      await expectTheme(page, theme);
    });
  });
}
