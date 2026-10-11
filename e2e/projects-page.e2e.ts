import { expect, test } from "./fixtures";
import { AA_NON_TEXT_CONTRAST, contrastRatio, lowContrastTexts, sampleSurface } from "./surface-colours";

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

test.describe("Projects page in dark mode", () => {
  test("fills the featured project's button with a light colour that stands out from its well", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });

    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);

    const button = page.getByRole("region", { name: "Featured project" }).locator('[data-slot="button"]');
    const sample = await sampleSurface(button);
    const [fill, well] = [sample.backdrop, sample.surround].map(([r, g, b]) => r + g + b) as [number, number];

    expect(fill).toBeGreaterThan(well);
    expect(contrastRatio(sample.backdrop, sample.surround)).toBeGreaterThanOrEqual(AA_NON_TEXT_CONTRAST);
    expect(lowContrastTexts(sample)).toEqual([]);
  });
});
