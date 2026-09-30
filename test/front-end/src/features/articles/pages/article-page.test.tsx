import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ArticlePageView } from "../../../../../../front-end/src/features/articles/pages/article-page";
import type { ArticleData } from "../../../../../../front-end/src/features/articles/lib/articles-sidebar";

const FIXTURE_ARTICLE: ArticleData = {
  title: "Yoga Nidra",
  description: "A way to be at peace in chaos.",
  date: "2026-03-03",
  tags: ["Personal Life"],
  type: "article",
  draft: false,
  category: "Personal Life",
  slug: "yoga-nidra-a-way-to-be-at-peace-in-chaos",
  body: "# Rest\n\nStillness.",
};

function renderView(props: {
  loading: boolean;
  notFound: boolean;
  error: string | null;
  article: ArticleData | null;
}): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(ArticlePageView, props)),
  );
}

describe("ArticlePageView", () => {
  test("renders the loading state while fetching", () => {
    const html = renderView({ loading: true, notFound: false, error: null, article: null });

    expect(html).toContain("Loading article...");
  });

  test("renders a 404 state for an absent slug", () => {
    const html = renderView({ loading: false, notFound: true, error: null, article: null });

    expect(html).toContain("Article not found");
    expect(html).toContain('href="/articles"');
    expect(html).toContain("Back to articles");
  });

  test("renders a destructive error for a non-404 failure", () => {
    const html = renderView({ loading: false, notFound: false, error: "Failed to load article", article: null });

    expect(html).toContain("Failed to load article");
    expect(html).toContain("text-destructive");
  });

  test("renders the article body and metadata once loaded", () => {
    const html = renderView({ loading: false, notFound: false, error: null, article: FIXTURE_ARTICLE });

    expect(html).toContain("Yoga Nidra");
    expect(html).toContain("A way to be at peace in chaos.");
    expect(html).toContain("Rest");
    expect(html).toContain("Stillness.");
    expect(html).toContain("Personal Life");
  });
});