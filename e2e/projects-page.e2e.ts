import { expect, test } from "./fixtures";

// Expectations come from the project entries in content/: "Minimal Android
// Launcher" is the only `featured: true` project, the other two fill the gallery.
test.describe("Projects page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
  });

  test("lists the featured project and the gallery from content/", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

    const cards = [
      { region: "Featured project", title: "Minimal Android Launcher", href: "/projects/minimal-android-launcher" },
      { region: "More projects", title: "Obsidian Content Pipeline", href: "/projects/obsidian-content-pipeline" },
      { region: "More projects", title: "Pi Sandbox Automation", href: "/projects/pi-sandbox-automation" },
    ];

    for (const { region, title, href } of cards) {
      const card = page.getByRole("region", { name: region }).getByRole("link", { name: new RegExp(title) });

      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("href", href);
    }
  });

  test("opens a project's case study from its card", async ({ page }) => {
    await page
      .getByRole("region", { name: "More projects" })
      .getByRole("link", { name: /Obsidian Content Pipeline/ })
      .click();

    await expect(page).toHaveURL(/\/projects\/obsidian-content-pipeline$/);
    const article = page.getByRole("article");

    // The markdown body repeats the title as its own `#` heading; the page header owns the real one.
    await expect(article.locator("header").getByRole("heading", { level: 1, name: "Obsidian Content Pipeline" })).toBeVisible();
    await expect(article.getByRole("heading", { level: 2, name: "Approach" })).toBeVisible();
    await expect(article.getByText("The pipeline normalizes frontmatter, filters drafts in production")).toBeVisible();
  });
});
