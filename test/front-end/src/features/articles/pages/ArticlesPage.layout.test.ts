import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../../../../../../front-end/src/features/articles/lib/articles-page-styles";
import { ArticleLocationTrail } from "../../../../../../front-end/src/features/articles/components/article-location-trail";
import { resolveArticlesTrailTargetSlug } from "../../../../../../front-end/src/features/articles/lib/articles-sidebar";
import {
  extractArticleTableOfContents,
  navigateToArticleHeadingById,
  type TocNavigationDebugEvent,
} from "../../../../../../front-end/src/features/articles/lib/article-toc";

describe("ARTICLES_PAGE_LAYOUT_CLASSES", () => {
  test("uses edge-to-edge split layout with a tokenized desktop sidebar and no divider line", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex w-full");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex-1");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("overflow-hidden");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("md:flex-row");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("mx-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("max-w-screen-2xl");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:basis-[var(--articles-sidebar-width)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:min-w-[var(--articles-sidebar-width)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:shrink-0");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:sticky");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("md:top-[4.2rem]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("overflow-y-auto");
    expect(Object.hasOwn(ARTICLES_PAGE_LAYOUT_CLASSES, "divider")).toBe(false);
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
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc).toContain("md:pr-[var(--articles-content-toc-gap)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("hidden md:block");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:fixed");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:right-6");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:w-[clamp(12rem,17vw,15.5rem)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("md:top-[5.25rem]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("bg-[var(--site-section-well-bg)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.toc).toContain("rounded-lg");
  });

  test("defines a shared panel box class for both TOC and sidebar surfaces", () => {
    expect(Object.hasOwn(ARTICLES_PAGE_LAYOUT_CLASSES, "panelBox")).toBe(true);
  });

  test("centers the location trail to the same measure as main article content", () => {
    expect(Object.hasOwn(ARTICLES_PAGE_LAYOUT_CLASSES, "locationTrailAlign")).toBe(true);
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.locationTrailAlign).toContain("mx-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.locationTrailAlign).toContain("w-full");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.locationTrailAlign).toContain("max-w-[75ch]");
  });
});

describe("ARTICLES_PAGE_TYPOGRAPHY_CLASSES", () => {
  test("uses hierarchy and readability defaults from typography research", () => {
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle).toContain("text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTitle).toContain("text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarTriggerLabel).toContain("text-sm font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).toContain("text-sm font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState).toContain("bg-[var(--adw-dark-5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState).toContain("text-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState).toContain("dark:bg-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState).toContain("dark:text-[var(--adw-dark-5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState).toContain("shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription).toContain("max-w-[65ch] text-base sm:text-lg leading-relaxed");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure).toContain("mx-auto w-full max-w-[75ch]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("bg-[var(--adw-dark-5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("text-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("font-bold");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("dark:bg-[var(--adw-light-1)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge).toContain("dark:text-[var(--adw-dark-5)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).toContain("[&>svg]:shrink-0");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocTitle).toContain("text-[calc(0.875rem+4pt)] font-bold tracking-tight");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLink).toContain("font-medium");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkActive).toContain("text-[var(--adw-dark-4)]");
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkInactive).toContain("text-[var(--adw-toc-inactive)]");
  });
});

describe("ArticleLocationTrail", () => {
  test("resolves the articles trail target to the default introduction slug", () => {
    expect(resolveArticlesTrailTargetSlug([
      { slug: "work-item", title: "Work", description: "w", date: "2024-02-01", tags: [], category: "Work", type: "article", draft: false },
      {
        slug: "introduction",
        title: "Intro",
        description: "i",
        date: "2024-01-01",
        tags: [],
        category: "Introduction",
        type: "article",
        draft: false,
      },
    ])).toBe("introduction");
  });

  test("renders home icon and current location trail format", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ArticleLocationTrail, {
        articleTitle: "article-under-test",
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onArticlesActivate: () => {},
      }),
    ));
    const separatorCount = (html.match(/&gt;/g) ?? []).length;

    expect(html).toContain('aria-label="Current location"');
    expect(html).toContain('href="/"');
    expect(html).toContain("lucide-house");
    expect(html).toContain("<button");
    expect(html).toContain("cursor-pointer");
    expect(separatorCount).toBe(2);
    expect(html).toContain("text-foreground truncate font-medium");
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
  test("scrolls to heading and updates hash via native fragment path when the heading exists", () => {
    let receivedScrollOptions: ScrollIntoViewOptions | null = null;
    let updatedHash: string | null = null;
    let loggedEvent: {
      headingId: string;
      foundTarget: boolean;
      stage: "fallback-hash" | "scroll";
      scrollYBefore: number;
      scrollYAfter: number;
    } | null = null;

    const didNavigate = navigateToArticleHeadingById("target-heading", {
      getElementById: () => ({
        scrollIntoView: (options?: ScrollIntoViewOptions) => {
          if (options !== undefined) {
            receivedScrollOptions = options;
          }
        },
      }),
      setHash: (headingId: string) => { updatedHash = headingId; },
      getScrollY: () => 200,
      logNavigation: (event) => { loggedEvent = event; },
    });

    expect(didNavigate).toBe(true);
    expect<ScrollIntoViewOptions | null>(receivedScrollOptions).toEqual({ behavior: "smooth", block: "start" });
    expect<string | null>(updatedHash).toBe("target-heading");
    expect<TocNavigationDebugEvent | null>(loggedEvent).toEqual({
      headingId: "target-heading",
      foundTarget: true,
      stage: "scroll",
      scrollYBefore: 200,
      scrollYAfter: 200,
    });
  });

  test("sidebar article button class does not include cursor-pointer, indicating Link-based navigation", () => {
    expect(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton).not.toContain("cursor-pointer");
  });

  test("falls back to native hash updates when the heading target is missing", () => {
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
      setHash: (hash: string) => { fallbackHash = hash; },
      getScrollY: () => 0,
      logNavigation: (event) => { loggedEvent = event; },
    });

    expect(didNavigate).toBe(false);
    expect<string | null>(fallbackHash).toBe("missing-heading");
    expect<TocNavigationDebugEvent | null>(loggedEvent).toEqual({
      headingId: "missing-heading",
      foundTarget: false,
      stage: "fallback-hash",
      scrollYBefore: 0,
      scrollYAfter: 0,
    });
  });
});
