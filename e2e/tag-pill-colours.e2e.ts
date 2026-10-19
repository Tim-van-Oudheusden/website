import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

interface PillColours {
  background: string;
  text: string;
}

async function pillColours(pill: Locator): Promise<PillColours> {
  return pill.evaluate((element) => {
    const style = getComputedStyle(element);

    return { background: style.backgroundColor, text: style.color };
  });
}

test.describe("Light-mode tag pill colours", () => {
  test.beforeEach(async ({ page }) => {
    // Images never change a pill's colour; skip them.
    await page.route((url) => url.pathname.startsWith("/content-assets/"), async (route) => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
  });

  test("project page tag pills are filled like article tag pills", async ({ page }) => {
    await page.goto("/articles/my-operating-system-is-a-container-image-yes-really", { waitUntil: "domcontentloaded" });

    const articlePill = page.getByRole("list", { name: "Tags" }).getByRole("link", { name: "Docker" });

    await expect(articlePill).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    const articleColours = await pillColours(articlePill);

    await page.goto("/projects/dailies", { waitUntil: "domcontentloaded" });

    const projectHeader = page.getByRole("article").locator("header");

    for (const tag of ["Linux", "GNOME", "Flatpak", "Python"]) {
      const projectPill = projectHeader.getByText(tag, { exact: true });

      await expect(projectPill).toBeVisible();
      expect({ tag, ...(await pillColours(projectPill)) }).toEqual({ tag, ...articleColours });
    }
  });
});
