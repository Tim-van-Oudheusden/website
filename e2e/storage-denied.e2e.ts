import { expect, test } from "./fixtures";
import { ROUTE_HEADINGS } from "./route-headings";

// A browser set to block all cookies, a sandboxed iframe and a managed policy all make these
// getters throw. ThemeProvider renders above every error boundary, so one unguarded read there
// empties every route (#1237). A read in a page breaks only that page, so every route is listed.
test.describe("With web storage denied", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      for (const name of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, name, {
          get: () => {
            throw new DOMException("Access is denied for this document.", "SecurityError");
          },
        });
      }
    });
  });

  for (const [path, heading] of ROUTE_HEADINGS) {
    test(`${path} still renders`, async ({ page }) => {
      const errors: string[] = [];

      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(path, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("a picked theme applies for the visit, and the next visit follows the system", async ({ page }) => {
    const html = page.locator("html");

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Toggle theme" }).click();
    await page.getByRole("menuitem", { name: "Dark" }).click();
    await expect(html).toHaveClass(/\bdark\b/);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});
