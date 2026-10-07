import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function scrollToSection(page: Page, sectionId: string): void {
  void page.evaluate((id) => {
    const element = document.getElementById(id);

    element?.scrollIntoView({ block: "start" });
  }, sectionId);
}

test.describe("Home placeholder sections implemented", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("showcases real projects, featured first, linking to GitHub or the case study", async ({ page }) => {
    const section = page.locator("section#for-devs");

    scrollToSection(page, "for-devs");
    await expect(section.getByRole("heading", { level: 2, name: "Open-source projects" })).toBeVisible();
    await expect(section.getByRole("heading", { level: 3 }).first()).toHaveText("Minimal Android Launcher");

    const github = section.getByRole("link", { name: "View on GitHub: Pi Sandbox Automation (opens in a new tab)" });

    await expect(github).toHaveAttribute("href", "https://github.com/Tim-van-Oudheusden/website");
    await expect(github).toHaveAttribute("target", "_blank");

    await expect(section.getByRole("link", { name: "Read case study: Obsidian Content Pipeline" })).toHaveAttribute(
      "href",
      "/projects/obsidian-content-pipeline",
    );
  });

  test("renders the about-me brick list and portrait", async ({ page }) => {
    const section = page.locator("section#about-me");

    scrollToSection(page, "about-me");
    await expect(section.getByRole("heading", { level: 2, name: "About me" })).toBeVisible();
    await expect(section.getByRole("listitem").first()).toBeVisible();
    await expect(section.getByRole("img", { name: "Portrait of Tim van Oudheusden" })).toBeVisible();
  });

  test("renders the recent-posts strip linked to real article pages", async ({ page }) => {
    const section = page.locator("section#whats-new");

    scrollToSection(page, "whats-new");
    await expect(section.getByRole("heading", { name: "What's new from the blog" })).toBeVisible();
    const introLink = section.getByRole("link", { name: /Introduction/ }).first();

    await expect(introLink).toHaveAttribute("href", "/articles/introduction");

    await expect(section.getByRole("link", { name: /container image/ }).first()).toHaveAttribute(
      "href",
      "/articles/my-operating-system-is-a-container-image-yes-really",
    );
  });

  test("renders the experience timeline from the LinkedIn positions", async ({ page }) => {
    const section = page.locator("section#experience");

    scrollToSection(page, "experience");
    await expect(section.getByRole("heading", { level: 2, name: "Experience" })).toBeVisible();

    const current = section.getByRole("link", { name: "Senior Software Engineer at Gemeente Tilburg (opens in a new tab)" });

    await expect(current).toHaveAttribute("href", "https://www.tilburg.nl/");
    await expect(section.getByRole("listitem").first()).toContainText("2024 — Present");
    await expect(section.getByRole("link", { name: "View full profile on LinkedIn (opens in a new tab)" })).toBeVisible();
  });
});
