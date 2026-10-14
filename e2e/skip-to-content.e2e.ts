import { expect, test } from "./fixtures";

test.describe("Skip to content link", () => {
  test.beforeEach(async ({ page }) => {
    // The skip link and the home page's own links read no content; keep these page loads off the back-end.
    await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.abort());
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("is hidden until the first Tab, then jumps keyboard focus past the top bar", async ({ page }) => {
    const skipLink = page.getByRole("link", { name: "Skip to content" });

    await expect(skipLink).not.toBeInViewport();

    await page.keyboard.press("Tab");

    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main-content$/);

    await page.keyboard.press("Tab");

    const focusInMain = await page.evaluate(() => document.getElementById("main-content")?.contains(document.activeElement));

    expect(focusInMain).toBe(true);
  });
});
