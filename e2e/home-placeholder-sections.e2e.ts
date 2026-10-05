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

  test("renders the 'How I work' workflow rows from real content", async ({ page }) => {
    const section = page.locator("section#for-devs");

    scrollToSection(page, "for-devs");
    await expect(section.getByRole("heading", { name: "How I work" })).toBeVisible();
    await expect(section.getByText("Obsidian content pipeline", { exact: true })).toBeVisible();
    await expect(section.getByText("Pi sandbox automation", { exact: true })).toBeVisible();
    await expect(section.getByText("Container-OS desktop", { exact: true })).toBeVisible();
    await expect(section).not.toContainText(/placeholder alternating feature/i);
  });

  test("renders the honest proof trust strip without fabricated metrics", async ({ page }) => {
    const section = page.locator("section#proof");

    scrollToSection(page, "proof");
    await expect(section.getByRole("heading", { name: "Proof, honestly" })).toBeVisible();
    await expect(section.getByText("Open source, from the repo to every article file", { exact: true })).toBeVisible();
    await expect(section).not.toContainText(/[0-9]%/);
  });

  test("renders the recent-posts strip linked to real article pages", async ({ page }) => {
    const section = page.locator("section#community-and-docs");

    scrollToSection(page, "community-and-docs");
    await expect(section.getByRole("heading", { name: "What's new from the blog" })).toBeVisible();
    const introLink = section.getByRole("link", { name: /Introduction/ }).first();

    await expect(introLink).toHaveAttribute("href", "/articles/introduction");

    await expect(section.getByRole("link", { name: /container image/ }).first()).toHaveAttribute(
      "href",
      "/articles/my-operating-system-is-a-container-image-yes-really",
    );
  });

  test("renders the 'Start here' curated reading list as real article links", async ({ page }) => {
    const section = page.locator("section#secondary-cta");

    scrollToSection(page, "secondary-cta");
    await expect(section.getByRole("heading", { name: "Start here" })).toBeVisible();

    await expect(section.getByRole("link", { name: /Introduction/ }).first()).toHaveAttribute(
      "href",
      "/articles/introduction",
    );

    await expect(section.getByRole("link", { name: /Yoga Nidra/ }).first()).toHaveAttribute(
      "href",
      "/articles/yoga-nidra-a-way-to-be-at-peace-in-chaos",
    );

    await expect(section).not.toContainText(/newsletter|subscribe|shop/i);
  });
});
