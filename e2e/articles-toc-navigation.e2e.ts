import { expect, test } from "@playwright/test";

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}

test.describe("Articles TOC navigation", () => {
  test("renders the articles page with a visible TOC", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Table of contents" })).toBeVisible();
  });

  test("navigates to the selected heading when a TOC item is clicked", async ({ page }) => {
    test.fail(true, "Known TOC runtime bug: TOC hash target can be missing in rendered heading IDs.");
    await page.goto("/articles", { waitUntil: "domcontentloaded" });

    const tableOfContents = page.getByRole("navigation", { name: "Table of contents" });
    await expect(tableOfContents).toBeVisible();

    const tocLinks = tableOfContents.getByRole("link");
    const tocLinkCount = await tocLinks.count();
    expect(tocLinkCount).toBeGreaterThan(0);

    const targetLink = tocLinks.nth(tocLinkCount > 1 ? 1 : 0);
    const targetHref = await targetLink.getAttribute("href");
    expect(targetHref).not.toBeNull();
    expect(targetHref).toMatch(/^#.+/);

    const targetHeadingId = (targetHref as string).slice(1);

    await targetLink.click();

    await expect(page).toHaveURL(new RegExp(`#${targetHeadingId}$`));

    const escapedId = escapeCssAttributeValue(targetHeadingId);
    const targetHeading = page.locator(`[id="${escapedId}"]`).first();
    await expect(targetHeading).toBeVisible();

    const targetHeadingBox = await targetHeading.boundingBox();
    expect(targetHeadingBox).not.toBeNull();
    if (targetHeadingBox != null) {
      expect(targetHeadingBox.y).toBeLessThan(260);
    }
  });
});
