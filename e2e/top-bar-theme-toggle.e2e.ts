import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

async function pickTheme(page: Page, theme: "Light" | "Dark" | "System"): Promise<void> {
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitem", { name: theme }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

test.describe("Top bar theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    // The top bar reads no content; keep these page loads off the back-end.
    await page.route((url) => url.pathname.startsWith("/api/"), (route) => route.abort());
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("dark theme toggles html.dark, is stored, and survives a reload", async ({ page }) => {
    const html = page.locator("html");

    await expect(html).not.toHaveClass(/\bdark\b/);

    await pickTheme(page, "Dark");

    await expect(html).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(html).toHaveClass(/\bdark\b/);

    await pickTheme(page, "Light");

    await expect(html).not.toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
  });

  test("system theme follows prefers-color-scheme, including live changes", async ({ page }) => {
    const html = page.locator("html");

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).not.toHaveClass(/\bdark\b/);

    await pickTheme(page, "System");

    await expect(html).toHaveClass(/\bdark\b/);
    expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("system");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).not.toHaveClass(/\bdark\b/);

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(html).toHaveClass(/\bdark\b/);
  });
});
