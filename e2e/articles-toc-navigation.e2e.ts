import { expect, test } from "@playwright/test";

test.describe("Articles TOC navigation", () => {
  test("renders the articles page with a visible TOC", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article aside nav").first()).toBeVisible();
  });

  test("keeps TOC ids aligned with rendered heading ids at runtime", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect(page.locator("article aside nav").first()).toBeVisible();

    const diagnostics = await page.evaluate(() => {
      const tocNav = document.querySelector("article aside nav");
      const tocIds = tocNav === null
        ? []
        : Array.from(tocNav.querySelectorAll('a[href^="#"]'))
          .map((link) => (link.getAttribute("href") ?? "").slice(1))
          .filter((id) => id.length > 0);

      const headingIds = Array
        .from(document.querySelectorAll("article h1[id], article h2[id], article h3[id]"))
        .map((heading) => heading.id);

      const missingTocIds = tocIds.filter((tocId) => !headingIds.includes(tocId));
      const shiftedMatches = missingTocIds.filter((tocId) => headingIds.includes(`${tocId}-1`));

      return {
        tocIds,
        headingIds,
        missingTocIds,
        shiftedMatches,
      };
    });

    expect(diagnostics.tocIds.length).toBeGreaterThan(0);
    expect(diagnostics.missingTocIds).toEqual([]);
    expect(diagnostics.shiftedMatches).toEqual([]);
  });

  test("navigates to an existing heading target when a TOC item is clicked", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });

    const tableOfContents = page.locator("article aside nav").first();
    await expect(tableOfContents).toBeVisible();

    const tocLinks = tableOfContents.getByRole("link");
    const tocLinkCount = await tocLinks.count();
    expect(tocLinkCount).toBeGreaterThan(0);

    const targetLink = tocLinks.nth(tocLinkCount > 1 ? 1 : 0);
    const targetHref = await targetLink.getAttribute("href");
    expect(targetHref).not.toBeNull();
    expect(targetHref).toMatch(/^#.+/);

    const targetHeadingId = targetHref!.slice(1);

    await targetLink.click();

    await expect(page).toHaveURL(new RegExp(`#${targetHeadingId}$`));

    const clickDiagnostics = await page.evaluate((clickedId) => {
      const targetByHash = document.getElementById(clickedId);
      const headingIds = Array
        .from(document.querySelectorAll("article h1[id], article h2[id], article h3[id]"))
        .map((heading) => heading.id);

      return {
        targetByHashExists: targetByHash !== null,
        shiftedIdExists: headingIds.includes(`${clickedId}-1`),
        headingIds,
      };
    }, targetHeadingId);

    expect(clickDiagnostics.targetByHashExists).toBe(true);
    expect(clickDiagnostics.shiftedIdExists).toBe(false);
  });
});
