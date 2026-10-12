import { describe, expect, test } from "bun:test";

import type { ArticleSummary } from "shared/articles";

import { selectArticlesByTag, tagPath } from "../../../../../../front-end/src/features/articles/lib/article-tags";

function summary(slug: string, tags: string[], date: string): ArticleSummary {
  return {
    title: slug,
    description: `About ${slug}`,
    date,
    tags,
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category: "Linux",
    slug,
  };
}

describe("tagPath", () => {
  test("links a multi-word, mixed-case tag to one lowercase hyphenated path", () => {
    expect(tagPath("Content API")).toBe("/tags/content-api");
    expect(tagPath("Docker")).toBe("/tags/docker");
  });

  test("keeps non-ASCII letters, percent-encoded", () => {
    expect(tagPath("Café")).toBe("/tags/caf%C3%A9");
  });
});

describe("selectArticlesByTag", () => {
  const articles = [
    summary("old-docker", ["Docker"], "2025-01-01"),
    summary("flatpak", ["Flatpak"], "2026-03-01"),
    summary("new-docker", ["Bazzite", "docker"], "2026-06-01"),
    summary("pipeline", ["Content API"], "2026-02-01"),
  ];

  test("lists the articles carrying the tag, case-insensitively, newest first", () => {
    expect(selectArticlesByTag(articles, "DOCKER").map((article) => article.slug)).toEqual(["new-docker", "old-docker"]);
  });

  test("matches a tag by the slug its path uses", () => {
    expect(selectArticlesByTag(articles, "content-api").map((article) => article.slug)).toEqual(["pipeline"]);
  });

  test("lists nothing for a tag no article carries", () => {
    expect(selectArticlesByTag(articles, "kubernetes")).toEqual([]);
  });
});
