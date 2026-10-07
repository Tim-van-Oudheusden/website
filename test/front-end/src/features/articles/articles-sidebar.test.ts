import { describe, expect, test } from "bun:test";

import { DEFAULT_ARTICLE_SLUG } from "shared";
import type { ArticleSummary } from "shared/articles";

import {
  getDefaultArticleSlug,
  groupArticlesByCategory,
} from "../../../../../front-end/src/features/articles/lib/articles-sidebar";

describe("article sidebar helpers", () => {
  test("getDefaultArticleSlug prefers the introduction slug regardless of API order", () => {
    const articles: ArticleSummary[] = [
      {
        title: "Linux First",
        description: "A Linux article",
        date: "2025-07-04T00:00:00Z",
        tags: ["linux"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Linux",
        slug: "linux-first",
      },
      {
        title: "Introduction",
        description: "Default intro article",
        date: "2026-02-08T00:00:00Z",
        tags: ["introduction"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Personal Life",
        slug: DEFAULT_ARTICLE_SLUG,
      },
    ];

    expect(getDefaultArticleSlug(articles)).toBe(DEFAULT_ARTICLE_SLUG);
  });

  test("groupArticlesByCategory groups using frontmatter categories", () => {
    const articles: ArticleSummary[] = [
      {
        title: "Linux Tips",
        description: "Linux article",
        date: "2025-07-03T00:00:00Z",
        tags: ["linux"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Linux",
        slug: "linux-tips",
      },
      {
        title: "Office Notes",
        description: "Work article",
        date: "2025-01-17T00:00:00Z",
        tags: ["work"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Work",
        slug: "office-notes",
      },
      {
        title: "Yoga",
        description: "Personal article",
        date: "2025-01-16T00:00:00Z",
        tags: ["personal"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Personal Life",
        slug: "yoga",
      },
    ];

    const grouped = groupArticlesByCategory(articles);

    expect(grouped.Linux.map((article) => article.slug)).toEqual(["linux-tips"]);
    expect(grouped.Work.map((article) => article.slug)).toEqual(["office-notes"]);
    expect(grouped["Personal Life"].map((article) => article.slug)).toEqual(["yoga"]);
  });

  test("groupArticlesByCategory includes the Introduction category", () => {
    const articles: ArticleSummary[] = [
      {
        title: "Introduction",
        description: "Default intro article",
        date: "2026-02-08T00:00:00Z",
        tags: ["introduction"],
        type: "article",
        socialImage: null,
        draft: false,
        homeRecommended: false,
        category: "Introduction",
        slug: "introduction",
      },
    ];

    const grouped = groupArticlesByCategory(articles);

    expect(grouped.Introduction.map((article) => article.slug)).toEqual(["introduction"]);
  });
});
