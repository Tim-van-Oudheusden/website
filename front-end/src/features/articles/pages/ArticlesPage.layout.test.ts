import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ArticleLocationTrail,
  resolveArticlesTrailTargetSlug,
} from "./ArticlesPage";

describe("ARTICLES_PAGE_LAYOUT_CLASSES", () => {
  test("uses edge-to-edge split layout with 15% sidebar and 2px divider", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex w-full flex-1");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("mx-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("max-w-screen-2xl");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("lg:basis-[15%]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("lg:shrink-0");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("w-0.5");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("bg-[var(--adw-light-4)]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).toContain("flex-1");
  });

  test("uses darker-than-topbar surfaces for sidebar and content in light and dark themes", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("bg-muted");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("dark:bg-card");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).toContain("bg-muted");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.content).toContain("dark:bg-card");
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
    expect(html).toContain("Articles");
    expect(html).toContain("My Article");
    expect(html).toContain("&gt;");
  });
});
