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
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:basis-[clamp(16.5rem,19vw,23rem)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:min-w-[16.5rem]");
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
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc).toContain("md:pr-[clamp(12rem,17.25vw,15.75rem)]");
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
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarTriggerLabel).toContain("text-sm font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).toContain("text-sm font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription).toContain("max-w-[65ch] text-base sm:text-lg leading-relaxed");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure).toContain("mx-auto w-full max-w-[75ch]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("bg-[var(--adw-dark-5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("text-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("dark:bg-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("dark:text-[var(--adw-dark-5)]");
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

  test("supports setext headings and complex heading text without id drift", () => {
    const toc = extractArticleTableOfContents(`# Intro's [Guide](https://example.com)
Section with *emphasis* and \`code\`
---
### Déjà vu & résumé
## Intro's Guide
## 你好 世界
`);

    expect(toc).toEqual([
      { id: "intros-guide", text: "Intro's Guide", depth: 1 },
      { id: "section-with-emphasis-and-code", text: "Section with emphasis and code", depth: 2 },
      { id: "déjà-vu-résumé", text: "Déjà vu & résumé", depth: 3 },
      { id: "intros-guide-1", text: "Intro's Guide", depth: 2 },
      { id: "你好-世界", text: "你好 世界", depth: 2 },
    ]);
  });
});

describe("navigateToArticleHeadingById", () => {
  test("scrolls to heading and updates URL hash when the heading exists", () => {
    let receivedScrollOptions: ScrollIntoViewOptions | null = null;
    let replacedUrl: string | null = null;
    let loggedEvent: {
      headingId: string;
      foundTarget: boolean;
      stage: "fallback-hash" | "scroll";
      scrollYBefore: number;
      scrollYAfter: number;
    } | null = null;

    const didNavigate = navigateToArticleHeadingById("target-heading", {
      getElementById: () => ({
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          receivedScrollOptions = options;
        },
      }),
      getCurrentPathWithQuery: () => "/articles?type=article",
      replaceUrl: (url: string) => { replacedUrl = url; },
      setHash: () => {},
      getScrollY: () => 200,
      logNavigation: (event) => { loggedEvent = event; },
    });

    expect(didNavigate).toBe(true);
    expect(receivedScrollOptions).toEqual({ behavior: "smooth", block: "start" });
    expect(replacedUrl).toBe("/articles?type=article#target-heading");
    expect(loggedEvent).toEqual({
      headingId: "target-heading",
      foundTarget: true,
      stage: "scroll",
      scrollYBefore: 200,
      scrollYAfter: 200,
    });
  });

  test("falls back to native hash updates when the heading target is missing", () => {
    let replacedUrl: string | null = null;
    let fallbackHash: string | null = null;
    let loggedEvent: {
      headingId: string;
      foundTarget: boolean;
      stage: "fallback-hash" | "scroll";
      scrollYBefore: number;
      scrollYAfter: number;
    } | null = null;

    const didNavigate = navigateToArticleHeadingById("missing-heading", {
      getElementById: () => null,
      getCurrentPathWithQuery: () => "/articles?type=article",
      replaceUrl: (url: string) => { replacedUrl = url; },
      setHash: (hash: string) => { fallbackHash = hash; },
      getScrollY: () => 0,
      logNavigation: (event) => { loggedEvent = event; },
    });

    expect(didNavigate).toBe(false);
    expect(replacedUrl).toBeNull();
    expect(fallbackHash).toBe("missing-heading");
    expect(loggedEvent).toEqual({
      headingId: "missing-heading",
      foundTarget: false,
      stage: "fallback-hash",
      scrollYBefore: 0,
      scrollYAfter: 0,
    });
  });
});
