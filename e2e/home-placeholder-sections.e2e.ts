import { fileURLToPath } from "node:url";

import type { Locator, Page } from "@playwright/test";

import type { ArticleSummary } from "../shared/src/articles";
import { compareArticles } from "../shared/src/articles";
import { listContent } from "../back-end/src/features/content/content";

import { expect, test } from "./fixtures";
import { openHome } from "./home-page";

async function scrollToSection(page: Page, sectionId: string): Promise<void> {
  await page.evaluate((id) => {
    const element = document.getElementById(id);

    element?.scrollIntoView({ block: "start" });
  }, sectionId);
}

const CONTENT_DIR = fileURLToPath(new URL("../content", import.meta.url));

/** Mirrors RECENT_POSTS_COUNT in the home recent-posts component. */
const RECENT_POSTS_COUNT = 4;

/**
 * The newest articles in content/, as the app lists them in development (drafts included, which is what
 * the e2e pod runs): same loader, same ordering, so publishing an article never needs a test edit.
 */
async function expectedRecentPosts(): Promise<ArticleSummary[]> {
  const items = await listContent(CONTENT_DIR, { type: "article" });

  return items
    .filter((item): item is ArticleSummary => item.type === "article")
    .sort(compareArticles)
    .slice(0, RECENT_POSTS_COUNT);
}

/** The home showcase with today's content, in rank order. */
const SHOWCASE = [
  { title: "Pindu OS", slug: "pindu-os" },
  { title: "Pindu launcher", slug: "pindu-launcher" },
  { title: "Dailies", slug: "dailies" },
  { title: "Minimal Android Launcher", slug: "minimal-android-launcher" },
  { title: "Obsidian Content Pipeline", slug: "obsidian-content-pipeline" },
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();

  return box!;
}

/** Each showcase tile's box, in rank order. The `has` locator is matched inside each item, so it starts at the page. */
async function tileBoxes(section: Locator): Promise<Box[]> {
  return Promise.all(SHOWCASE.map(async ({ title }) => boxOf(section.getByRole("listitem").filter({
    has: section.page().getByRole("heading", { level: 3, name: title, exact: true }),
  }))));
}

/** `wide` spans two columns of the row that `standard` spans one of: two standard widths plus the gap. */
function expectWideBesideStandard(wide: Box, standard: Box, gap: number): void {
  expect(Math.abs(wide.y - standard.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(wide.width - (2 * standard.width + gap))).toBeLessThanOrEqual(1);
}

test.describe("Home placeholder sections implemented", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("showcases real projects, featured first, each linking to its project page", async ({ page }) => {
    await openHome(page, { theme: "light", content: ["project"] });

    const section = page.locator("section#for-devs");

    await scrollToSection(page, "for-devs");
    await expect(section.getByRole("heading", { level: 2, name: "Open-source projects" })).toBeVisible();

    await expect(section.getByRole("heading", { level: 3 })).toHaveText(SHOWCASE.map(({ title }) => title));

    for (const { title, slug } of SHOWCASE) {
      await expect(section.getByRole("link", { name: `Learn more: ${title}`, exact: true })).toHaveAttribute(
        "href",
        `/projects/${slug}`,
      );
    }

    await expect(section.getByRole("link", { name: "Learn more: Dailies" })).not.toHaveAttribute("target", "_blank");

    // Bento at 1440 wide: the lead's row, Pindu launcher (wide) beside Dailies, then Minimal beside Obsidian (wide).
    const gap = await section.getByRole("list").evaluate((list) => Number.parseFloat(getComputedStyle(list).columnGap));
    const [, launcher, dailies, minimal, obsidian] = await tileBoxes(section);

    expectWideBesideStandard(launcher!, dailies!, gap);
    expectWideBesideStandard(obsidian!, minimal!, gap);
    expect(minimal!.y).toBeGreaterThan(launcher!.y + launcher!.height);
    expect(obsidian!.x).toBeGreaterThan(minimal!.x);

    const covers = section.getByRole("img").locator("..");

    await expect(covers).toHaveCount(SHOWCASE.length);

    for (const cover of await covers.all()) {
      const { width, height } = await boxOf(cover);

      expect(width / height).toBeCloseTo(1.6, 2);
    }

    // On a phone the tiles stack: one left edge, in rank order.
    await page.setViewportSize({ width: 390, height: 844 });

    const stacked = await tileBoxes(section);

    for (const [index, box] of stacked.entries()) {
      expect(Math.abs(box.x - stacked[0]!.x)).toBeLessThanOrEqual(1);

      if (index > 0) {
        expect(box.y).toBeGreaterThan(stacked[index - 1]!.y);
      }
    }
  });

  test("renders the agentic teaser with the flow of work and a link to the Agentic tab", async ({ page }) => {
    await openHome(page, { theme: "light", content: [] });

    const section = page.locator("section#agentic");

    await scrollToSection(page, "agentic");
    await expect(section.getByRole("heading", { level: 2, name: "Built with agents" })).toBeVisible();
    await expect(section.getByRole("list", { name: "How a change goes from issue to live" }).getByRole("listitem")).toHaveCount(5);
    await section.getByRole("link", { name: "Watch the hive work" }).click();
    await expect(page).toHaveURL(/\/agentic$/);
  });

  test("renders the recent-posts strip linked to real article pages", async ({ page }) => {
    await openHome(page, { theme: "light", content: ["article"] });

    const section = page.locator("section#whats-new");

    await scrollToSection(page, "whats-new");
    await expect(section.getByRole("heading", { name: "What's new from the blog" })).toBeVisible();
    const expected = await expectedRecentPosts();

    expect(expected).toHaveLength(RECENT_POSTS_COUNT);

    const links = section.getByRole("listitem").getByRole("link");

    await expect(links).toHaveCount(expected.length);

    for (const [index, { title, slug }] of expected.entries()) {
      const link = links.nth(index);

      await expect(link).toContainText(title);
      await expect(link).toHaveAttribute("href", `/articles/${slug}`);
    }

    const [first] = expected;

    await links.first().click();
    await expect(page).toHaveURL(new RegExp(`/articles/${first!.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: first!.title, exact: true })).toBeVisible();
  });

  test("renders the experience timeline from the LinkedIn positions", async ({ page }) => {
    await openHome(page, { theme: "light", content: [] });

    const section = page.locator("section#experience");

    await scrollToSection(page, "experience");
    await expect(section.getByRole("heading", { level: 2, name: "Experience" })).toBeVisible();

    const current = section.getByRole("link", { name: "Senior Software Engineer at Gemeente Tilburg (opens in a new tab)" });

    await expect(current).toHaveAttribute("href", "https://www.tilburg.nl/");
    await expect(section.getByRole("listitem").first()).toContainText("2024 — Present");
    await expect(section.getByRole("link", { name: "View full profile on LinkedIn (opens in a new tab)" })).toBeVisible();
  });

  test("ends the page with a socials footer linking to GitHub and LinkedIn", async ({ page }) => {
    await openHome(page, { theme: "light", content: [] });

    const footer = page.locator("footer#socials");

    await scrollToSection(page, "socials");
    await expect(footer.getByRole("heading", { level: 2, name: "Socials" })).toBeVisible();

    const github = footer.getByRole("link", { name: "GitHub (opens in a new tab)" });

    await expect(github).toHaveAttribute("href", "https://github.com/Tim-van-Oudheusden");
    await expect(github).toHaveAttribute("target", "_blank");

    await expect(footer.getByRole("link", { name: "LinkedIn (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/tim-van-oudheusden",
    );
  });
});
