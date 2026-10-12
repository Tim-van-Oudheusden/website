import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ArticleData, ArticleSummary } from "shared/articles";

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

function renderContent(article: ArticleData = FIXTURE_ARTICLE, articles: ArticleSummary[] = [FIXTURE_ARTICLE]): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ArticleContent, {
        article,
        articles,
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

  test("links each tag to the page listing every article with that tag", () => {
    const html = renderContent({ ...FIXTURE_ARTICLE, tags: ["Docker", "Content API"] });
    const tags = /<ul aria-label="Tags".*?<\/ul>/s.exec(html)?.[0] ?? "";

    expect(tags).toMatch(/<a[^>]*href="\/tags\/docker"[^>]*>Docker<\/a>/);
    expect(tags).toMatch(/<a[^>]*href="\/tags\/content-api"[^>]*>Content API<\/a>/);
  });

  test("links to other articles from the same category after the body", () => {
    const linuxArticle: ArticleData = { ...FIXTURE_ARTICLE, title: "Flatpak", slug: "flatpak", category: "Linux" };
    const html = renderContent(linuxArticle, [
      linuxArticle,
      { ...FIXTURE_ARTICLE, title: "Fedora Silverblue", slug: "silverblue", category: "Linux" },
      { ...FIXTURE_ARTICLE, title: "Office notes", slug: "office-notes", category: "Work" },
    ]);

    const related = /<nav aria-label="More from Linux".*?<\/nav>/s.exec(html)?.[0] ?? "";

    expect(related).toMatch(/<a[^>]*href="\/articles\/silverblue"[^>]*>.*Fedora Silverblue/s);
    expect(related).not.toContain("/articles/flatpak");
    expect(related).not.toContain("/articles/office-notes");
  });

  test("renders no related block when the category has no other articles", () => {
    expect(renderContent()).not.toContain("More from");
  });

  test("renders the loading state when the article is still fetching", () => {
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticleContent, {
          article: null,
          articles: [],
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
          articles: [],
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
