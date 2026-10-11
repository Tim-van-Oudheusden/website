import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ArticleData } from "shared/articles";

import { ArticleContent } from "../../../../../../front-end/src/features/articles/components/article-content";
import type { UseArticleTocResult } from "../../../../../../front-end/src/features/articles/hooks/use-article-toc";

const FIXTURE_ARTICLE: ArticleData = {
  title: "Introduction",
  description: "What this site is about.",
  date: "2026-02-08",
  tags: ["Introduction"],
  type: "article",
  socialImage: null,
  draft: false,
  homeRecommended: false,
  category: "Introduction",
  slug: "introduction",
  body: "# Intro\n\nThe first post.",
};

const NO_TOC: UseArticleTocResult = { tocItems: [], visibleTocHeadingIds: [], currentTocHeadingId: null };

function renderContent(article: ArticleData = FIXTURE_ARTICLE): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ArticleContent, {
        article,
        loading: false,
        error: null,
        toc: NO_TOC,
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

  test("makes the article title the only h1 and nests markdown sections under it", () => {
    const html = renderContent({ ...FIXTURE_ARTICLE, body: "# Intro\n\nText.\n\n## Detail\n\nMore." });

    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Introduction<\/h1>/);
    expect(html).toMatch(/<h2 id="intro"/);
    expect(html).toMatch(/<h3 id="detail"/);
  });

  test("renders the location trail back to the articles list", () => {
    const html = renderContent();

    expect(html).toContain('aria-label="Current location"');
    expect(html).toContain('href="/"');
  });

  test("shows the publish date in words, machine-readable, with the reading time", () => {
    const html = renderContent();

    expect(html).toMatch(/<time[^>]*dateTime="2026-02-08"[^>]*>February 8th, 2026<\/time>/);
    expect(html).toContain("1 min read");
  });

  test("shows the article's social image as its cover", () => {
    const html = renderContent({ ...FIXTURE_ARTICLE, socialImage: "images/cover.png" });

    expect(html).toMatch(/<img[^>]*src="\/content-assets\/images\/cover.png"/);
  });

  test("renders no cover when the article has no social image", () => {
    expect(renderContent()).not.toContain("<img");
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
          toc: NO_TOC,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onArticlesActivate: () => {},
        }),
      ),
    );

    expect(html).toContain("Loading article...");
    // With no article title yet, the page still has one h1 naming it.
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Articles<\/h1>/);
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
          toc: NO_TOC,
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onArticlesActivate: () => {},
        }),
      ),
    );

    expect(html).toContain("Failed to load article");
    expect(html).toContain("text-destructive");
    expect(html).toMatch(/<h1[^>]*>Articles<\/h1>/);
  });
});
