import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
  ArticleLocationTrail,
  extractArticleTableOfContents,
  navigateToArticleHeadingById,
  resolveArticlesTrailTargetSlug,
} from "./ArticlesPage";

describe("ARTICLES_PAGE_LAYOUT_CLASSES", () => {
  test("uses edge-to-edge split layout with 15% sidebar and 0.5px divider", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex w-full");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex-1");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("overflow-hidden");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("md:flex-row");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("mx-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("max-w-screen-2xl");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:basis-[clamp(13rem,15vw,18rem)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:min-w-[13rem]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:shrink-0");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:sticky");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:top-[4.2rem]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("overflow-y-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("w-[0.5px]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("bg-[var(--adw-light-5)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).toContain("flex-1");
  });

  test("uses shared brown page surfaces for sidebar and content", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).not.toContain("dark:bg-card");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).not.toContain("dark:bg-card");
  });

  test("uses a slimmer right-anchored TOC on tablet and desktop", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc).toContain("md:pr-[clamp(13rem,19vw,17rem)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("hidden md:block");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:fixed");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:right-6");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:w-[clamp(12rem,17vw,15.5rem)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:top-[5.25rem]");
  });
});

describe("ARTICLES_PAGE_TYPOGRAPHY_CLASSES", () => {
  test("uses hierarchy and readability defaults from typography research", () => {
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle).toContain("text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTitle).toContain("text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarTriggerLabel).toContain("font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).toContain("text-base font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription).toContain("max-w-[65ch] text-base sm:text-lg leading-relaxed");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure).toContain("mx-auto w-full max-w-[75ch]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("bg-[var(--adw-brown-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).toContain("[&>svg]:shrink-0");
  });
});

describe("ArticleLocationTrail", () => {
  test("resolves the articles trail target to the default introduction slug", () => {
    expect(resolveArticlesTrailTargetSlug([
      { slug: "work-item", title: "Work", description: "w", date: "2024-02-01", tags: [], category: "Work" },
      {
        slug: "introduction",
        title: "Intro",
        description: "i",
        date: "2024-01-01",
        tags: [],
        category: "Introduction",
      },
    ])).toBe("introduction");
  });

  test("renders home icon and current location trail format", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ArticleLocationTrail, {
        articleTitle: "My Article",
        onArticlesActivate: () => {},
      }),
    ));
    expect(html).toContain('aria-label="Current location"');
    expect(html).toContain('href="/"');
    expect(html).toContain("lucide-house");
    expect(html).toContain("<button");
    expect(html).toContain("cursor-pointer");
    expect(html).toContain("Articles");
    expect(html).toContain("My Article");
    expect(html).toContain("&gt;");
  });
});

describe("extractArticleTableOfContents", () => {
  test("extracts H1/H2/H3 headings with stable, unique anchor ids", () => {
    const toc = extractArticleTableOfContents(`# Title

## Start Here
Paragraph

### Details
More text

## Start Here
`);

    expect(toc).toEqual([
      { id: "title", text: "Title", depth: 1 },
      { id: "start-here", text: "Start Here", depth: 2 },
      { id: "details", text: "Details", depth: 3 },
      { id: "start-here-1", text: "Start Here", depth: 2 },
    ]);
  });
});

describe("navigateToArticleHeadingById", () => {
  test("scrolls to heading and updates URL hash when the heading exists", () => {
    let receivedScrollOptions: ScrollIntoViewOptions | null = null;
    let replacedUrl: string | null = null;

    const didNavigate = navigateToArticleHeadingById("target-heading", {
      getElementById: () => ({
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          receivedScrollOptions = options;
        },
      }),
      getCurrentPathWithQuery: () => "/articles?type=article",
      replaceUrl: (url: string) => { replacedUrl = url; },
    });

    expect(didNavigate).toBe(true);
    expect(receivedScrollOptions).toEqual({ behavior: "smooth", block: "start" });
    expect(replacedUrl).toBe("/articles?type=article#target-heading");
  });
});
