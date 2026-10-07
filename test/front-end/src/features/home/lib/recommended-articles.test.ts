import { describe, expect, test } from "bun:test";

import type { ArticleSummary } from "shared/articles";

import { resolveCuratedArticles, selectRecommendedArticles } from "../../../../../../front-end/src/features/home/lib/recommended-articles";

function article(slug: string, date: string): ArticleSummary {
  return {
    title: slug,
    slug,
    date,
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    category: "Linux",
    description: `About ${slug}.`,
  };
}

const ARTICLES: ArticleSummary[] = [
  article("pool-a", "2025-01-01"),
  article("pool-b", "2025-02-01"),
  article("pool-c", "2025-03-01"),
  article("pool-d", "2025-04-01"),
  article("newest-outside-pool", "2026-09-01"),
  article("older-outside-pool", "2026-08-01"),
];

const POOL = ["pool-a", "pool-b", "pool-c", "pool-d"];

/** A deterministic random source that replays `values` in order, then repeats the last one. */
function sequence(...values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;

    index += 1;

    return value;
  };
}

function slugs(articles: ArticleSummary[]): string[] {
  return articles.map((item) => item.slug);
}

describe("resolveCuratedArticles", () => {
  test("keeps only curated slugs and preserves their stated order", () => {
    expect(slugs(resolveCuratedArticles(ARTICLES, ["pool-c", "pool-a", "pool-b"]))).toEqual(["pool-c", "pool-a", "pool-b"]);
  });

  test("skips curated slugs that do not exist in the content", () => {
    expect(slugs(resolveCuratedArticles(ARTICLES, ["pool-a", "no-such-post", "pool-d"]))).toEqual(["pool-a", "pool-d"]);
  });
});

describe("selectRecommendedArticles", () => {
  test("picks three distinct articles from the curated pool", () => {
    const picked = slugs(selectRecommendedArticles(ARTICLES, POOL, sequence(0.5, 0.1, 0.9)));

    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);

    for (const slug of picked) {
      expect(POOL).toContain(slug);
    }
  });

  test("lets the random source decide the pick, so each page load can differ", () => {
    const low = slugs(selectRecommendedArticles(ARTICLES, POOL, sequence(0)));
    const high = slugs(selectRecommendedArticles(ARTICLES, POOL, sequence(0.99)));

    expect(low).not.toEqual(high);
    expect(slugs(selectRecommendedArticles(ARTICLES, POOL, sequence(0)))).toEqual(low);
  });

  test("skips pool slugs that do not exist and never repeats an article", () => {
    const picked = slugs(selectRecommendedArticles(
      ARTICLES,
      ["pool-a", "no-such-post", "pool-a", "pool-b", "pool-c"],
      sequence(0.99),
    ));

    expect([...picked].sort()).toEqual(["pool-a", "pool-b", "pool-c"]);
  });

  test("fills a short pool with the newest other articles", () => {
    const picked = slugs(selectRecommendedArticles(ARTICLES, ["pool-a", "no-such-post"], sequence(0)));

    expect(picked).toEqual(["pool-a", "newest-outside-pool", "older-outside-pool"]);
  });

  test("returns every article when the site has fewer than three", () => {
    const few = [article("only-one", "2025-01-01"), article("only-two", "2025-02-01")];

    expect(slugs(selectRecommendedArticles(few, POOL, sequence(0)))).toEqual(["only-two", "only-one"]);
  });
});
