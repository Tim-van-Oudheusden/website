import { expect, test } from "@playwright/test";

test.describe("Home start portrait layout", () => {
  test("anchors portrait to white box bottom-right without right/bottom gaps and keeps top overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const portrait = page.getByRole("img", { name: "Portrait of Tim van Oudheusden" });
    await expect(portrait).toBeVisible();

    const layout = await page.evaluate(() => {
      const whiteBox = document.querySelector("section#start > div");
      const image = document.querySelector('section#start img[alt="Portrait of Tim van Oudheusden"]');
      if (whiteBox == null || image == null) {
        return null;
      }

      const whiteBoxRect = whiteBox.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      return {
        rightGap: whiteBoxRect.right - imageRect.right,
        bottomGap: whiteBoxRect.bottom - imageRect.bottom,
        topOverflowAmount: whiteBoxRect.top - imageRect.top,
      };
    });

    expect(layout).not.toBeNull();
    expect((layout as { rightGap: number }).rightGap).toBeLessThanOrEqual(2);
    expect((layout as { bottomGap: number }).bottomGap).toBeLessThanOrEqual(2);
    expect((layout as { topOverflowAmount: number }).topOverflowAmount).toBeGreaterThan(0);
  });
});
