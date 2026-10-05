import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ArticleContent } from "../../../../../../front-end/src/features/articles/components/article-content";
import type { ArticleData } from "shared/articles";

const FIXTURE_ARTICLE: ArticleData = {
  title: "Introduction",
  description: "What this site is about.",
  date: "2026-02-08",
  tags: ["Introduction"],
  type: "article",
  draft: false,
  category: "Introduction",
  slug: "introduction",
  body: "# Intro\n\nThe first post.",
};

function renderContent(): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ArticleContent, {
        article: FIXTURE_ARTICLE,
        loading: false,
        error: null,
        tocItems: [],
        visibleTocHeadingIds: [],
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onArticlesActivate: () => {},
      }),
    ),
  );
}

describe("ArticleContent", () => {
  test("renders the article title, description, and markdown body", () => {
    const html = renderContent();

    expect(html).toContain("Introduction");
    expect(html).toContain("What this site is about.");
    expect(html).toContain("Intro");
    expect(html).toContain("The first post.");
  });

  test("renders the location trail back to the articles list", () => {
    const html = renderContent();

    expect(html).toContain('aria-label="Current location"');
    expect(html).toContain('href="/"');
  });

  test("renders the loading state when the article is still fetching", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticleContent, {
          article: null,
          loading: true,
          error: null,
          tocItems: [],
          visibleTocHeadingIds: [],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onArticlesActivate: () => {},
        }),
      ),
    );

    expect(html).toContain("Loading article...");
  });

  test("renders the article error when the fetch fails", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticleContent, {
          article: null,
          loading: false,
          error: "Failed to load article",
          tocItems: [],
          visibleTocHeadingIds: [],
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onArticlesActivate: () => {},
        }),
      ),
    );

    expect(html).toContain("Failed to load article");
    expect(html).toContain("text-destructive");
  });
});
