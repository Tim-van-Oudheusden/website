import { describe, expect, test } from "bun:test";

import type { ArticleCategory } from "shared";
import type { ArticleSummary } from "shared/articles";

import { selectRelatedArticles } from "../../../../../../front-end/src/features/articles/lib/related-articles";

function summary(slug: string, category: ArticleCategory, date: string): ArticleSummary {
  return {
    title: slug,
    description: `About ${slug}`,
    date,
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category,
    slug,
  };
}

describe("selectRelatedArticles", () => {
  test("lists the three newest other articles from the current article's category", () => {
    const current = summary("current", "Linux", "2026-05-01");
    const articles = [
      summary("oldest-linux", "Linux", "2025-01-01"),
      current,
      summary("work-note", "Work", "2026-09-01"),
      summary("newest-linux", "Linux", "2026-08-01"),
      summary("older-linux", "Linux", "2026-02-01"),
      summary("middle-linux", "Linux", "2026-04-01"),
    ];

    expect(selectRelatedArticles(articles, current).map((article) => article.slug)).toEqual([
      "newest-linux",
      "middle-linux",
      "older-linux",
    ]);
  });
});
