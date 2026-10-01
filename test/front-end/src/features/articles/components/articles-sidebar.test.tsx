import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ArticlesSidebar } from "../../../../../../front-end/src/features/articles/components/articles-sidebar";
import type { ArticleSummary } from "shared";

const FIXTURE_ARTICLES: ArticleSummary[] = [
  {
    title: "My operating system is a container image, yes, really",
    description: "A container desktop.",
    date: "2026-01-01",
    tags: ["Linux"],
    type: "article",
    draft: false,
    category: "Linux",
    slug: "my-operating-system-is-a-container-image-yes-really",
  },
  {
    title: "Introduction",
    description: "About the site.",
    date: "2026-02-02",
    tags: [],
    type: "article",
    draft: false,
    category: "Introduction",
    slug: "introduction",
  },
];

function renderSidebar(selectedSlug: string | null = null): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ArticlesSidebar, { articles: FIXTURE_ARTICLES, selectedSlug }),
    ),
  );
}

describe("ArticlesSidebar", () => {
  test("groups articles under their frontmatter category", () => {
    const html = renderSidebar();

    expect(html).toContain("Introduction");
    expect(html).toContain("Linux");
    expect(html).toContain("my-operating-system-is-a-container-image-yes-really");
    expect(html).toContain("introduction");
  });

  test("links each article to its /articles/:slug page", () => {
    const html = renderSidebar();

    expect(html).toContain("/articles/my-operating-system-is-a-container-image-yes-really");
    expect(html).toContain("/articles/introduction");
  });

  test("marks the selected article with the selected-state styling", () => {
    const html = renderSidebar("introduction");

    expect(html).toContain("bg-[var(--adw-dark-5)]");
  });
});