import { expect, test } from "./fixtures";

test.describe("Top bar mobile menu", () => {
  test.beforeEach(async ({ page }) => {
    // The top bar reads no content; keep these page loads off the back-end.
    await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.abort());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("hamburger opens a sheet whose links navigate and close it", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();

    const sheet = page.getByRole("dialog", { name: "Navigation" });

    await expect(sheet).toBeVisible();

    for (const label of ["Home", "Articles", "Projects"]) {
      await expect(sheet.getByRole("link", { name: label, exact: true })).toBeVisible();
    }

    await sheet.getByRole("link", { name: "Articles", exact: true }).click();

    await expect(page).toHaveURL(/\/articles$/);
    await expect(sheet).toBeHidden();
  });
});
