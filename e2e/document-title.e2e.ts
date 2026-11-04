import { expect, test } from "./fixtures";

// The app shell keeps one title element for the whole visit, so the tab has to follow
// client-side navigation. The server only titles the page a visit starts on.
test.describe("Document title", () => {
  test("follows the top bar from page to page and back home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("Build with Tim");

    const nav = page.getByRole("navigation").first();

    await nav.getByRole("link", { name: "Projects" }).click();
    await expect(page).toHaveTitle("Projects | Build with Tim");

    await nav.getByRole("link", { name: "Agentic" }).click();
    await expect(page).toHaveTitle("Agentic | Build with Tim");

    await page.goBack();
    await expect(page).toHaveTitle("Projects | Build with Tim");
  });

  test("names an article once it has loaded", async ({ page }) => {
    await page.goto("/articles/introduction", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle("Introduction | Build with Tim");
  });
});
