import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ARTICLES_PAGE_LAYOUT_CLASSES, ArticleLocationTrail } from "./ArticlesPage";

describe("ARTICLES_PAGE_LAYOUT_CLASSES", () => {
  test("uses edge-to-edge split layout with 15% sidebar and 2px divider", () => {
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).toContain("flex w-full flex-1");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("mx-auto");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.container).not.toContain("max-w-screen-2xl");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("lg:basis-[15%]");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.sidebar).toContain("lg:shrink-0");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("w-0.5");
    expect(ARTICLES_PAGE_LAYOUT_CLASSES.divider).toContain("bg-border");
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
  test("renders home icon and current location trail format", () => {
    const html = renderToStaticMarkup(createElement(ArticleLocationTrail, { articleTitle: "My Article" }));
    expect(html).toContain('aria-label="Current location"');
    expect(html).toContain("lucide-house");
    expect(html).toContain("Articles");
    expect(html).toContain("My Article");
    expect(html).toContain("&gt;");
  });
});
