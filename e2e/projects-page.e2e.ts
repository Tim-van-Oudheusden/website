import { expect, test } from "./fixtures";

// Expectations come from the project entries in content/: "Pindu OS" is the
// only `featured: true` project, the other four fill the gallery in
// `projectOrder`.
test.describe("Projects page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
  });

  test("lists the featured project and the gallery from content/", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();

    const cards = [
      { region: "Featured project", title: "Pindu OS", href: "/projects/pindu-os" },
      { region: "More projects", title: "Pindu launcher", href: "/projects/pindu-launcher" },
      { region: "More projects", title: "Dailies", href: "/projects/dailies" },
      { region: "More projects", title: "Minimal Android Launcher", href: "/projects/minimal-android-launcher" },
      { region: "More projects", title: "Obsidian Content Pipeline", href: "/projects/obsidian-content-pipeline" },
    ];

    for (const { region, title, href } of cards) {
      const card = page.getByRole("region", { name: region }).getByRole("link", { name: new RegExp(title) });

      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("href", href);
    }
  });

  test("starts the hero well on the top bar logo's left edge", async ({ page }) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });

      // The logo is the top bar's first link home; the desktop nav's "Home" link follows it.
      const logo = await page.getByRole("banner").locator('a[href="/"]').first().boundingBox();
      const hero = await page.getByRole("region", { name: "Projects", exact: true }).boundingBox();

      expect(hero?.x, `at ${String(width)}px`).toBeCloseTo(logo?.x ?? Number.NaN, 0);
    }
  });

  test("opens a project's page from its card", async ({ page }) => {
    await page
      .getByRole("region", { name: "More projects" })
      .getByRole("link", { name: /Obsidian Content Pipeline/ })
      .click();

    await expect(page).toHaveURL(/\/projects\/obsidian-content-pipeline$/);
    const article = page.getByRole("article");

    // The markdown body repeats the title as its own `#` heading, demoted to <h2>; the page header owns the only <h1>.
    const title = page.getByRole("heading", { level: 1 });

    await expect(title).toHaveText("Obsidian Content Pipeline");
    await expect(title).toHaveCount(1);
    await expect(article.locator("header").getByRole("heading", { level: 1 })).toBeVisible();
    await expect(article.locator(".prose").getByRole("heading", { level: 3, name: "Approach" })).toBeVisible();
    await expect(article.getByText("The pipeline normalizes frontmatter, filters drafts in production")).toBeVisible();
  });
});
