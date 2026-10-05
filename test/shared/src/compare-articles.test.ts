import { describe, expect, test } from "bun:test";
import { compareArticles, type ArticleSummary } from "../../../shared/src/articles";

function article(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    title: "Article",
    description: "Description",
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "article",
    draft: false,
    category: "Linux",
    slug: "article",
    ...overrides,
  };
}

function sortedSlugs(articles: ArticleSummary[]): string[] {
  return [...articles].sort(compareArticles).map((item) => item.slug);
}

describe("compareArticles", () => {
  test("orders newest-first by date", () => {
    const newest = article({ slug: "newest", date: "2026-03-01T00:00:00Z" });
    const oldest = article({ slug: "oldest", date: "2025-01-15T00:00:00Z" });
    const middle = article({ slug: "middle", date: "2025-06-01T00:00:00Z" });

    expect(sortedSlugs([oldest, newest, middle])).toEqual(["newest", "middle", "oldest"]);
  });

  test("breaks equal dates by title, then slug", () => {
    const zSlug = article({ slug: "z-slug", title: "Alpha", date: "2026-01-01T00:00:00Z" });
    const aSlug = article({ slug: "a-slug", title: "Zeta", date: "2026-01-01T00:00:00Z" });

    // Title dominates the tie-break, so "Alpha" (slug z-slug) precedes "Zeta" (slug a-slug).
    expect(sortedSlugs([aSlug, zSlug])).toEqual(["z-slug", "a-slug"]);
  });

  test("orders equal dates and titles by slug", () => {
    const b = article({ slug: "b", date: "2026-01-01T00:00:00Z" });
    const a = article({ slug: "a", date: "2026-01-01T00:00:00Z" });

    expect(sortedSlugs([b, a])).toEqual(["a", "b"]);
  });

  test("does not throw for unparseable dates and preserves a total order", () => {
    const unparseable = article({ slug: "zeta", date: "not-a-date" });
    const parseable = article({ slug: "alpha", date: "2026-01-01T00:00:00Z" });

    expect(sortedSlugs([unparseable, parseable])).toEqual(["alpha", "zeta"]);
  });

  test("does not mutate the input array", () => {
    const input = [
      article({ slug: "b", date: "2026-02-01T00:00:00Z" }),
      article({ slug: "a", date: "2026-03-01T00:00:00Z" }),
    ];
    const inputSlugs = input.map((item) => item.slug);

    sortedSlugs(input);

    expect(input.map((item) => item.slug)).toEqual(inputSlugs);
  });
});
