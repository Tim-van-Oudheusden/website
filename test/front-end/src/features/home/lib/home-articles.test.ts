import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { API_BASE, ROUTES } from "shared";
import { fetchHomeArticlesAsync, sortArticleSummariesDesc } from "../../../../../../front-end/src/features/home/lib/home-articles";
import type { ArticleSummary } from "../../../../../../front-end/src/features/articles/lib/articles-sidebar";

const originalFetch = globalThis.fetch;

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

describe("sortArticleSummariesDesc", () => {
  test("sorts newest-first by date", () => {
    const newest = article({ slug: "newest", date: "2026-03-01T00:00:00Z" });
    const oldest = article({ slug: "oldest", date: "2025-01-15T00:00:00Z" });
    const middle = article({ slug: "middle", date: "2025-06-01T00:00:00Z" });

    expect(sortArticleSummariesDesc([oldest, newest, middle]).map((a) => a.slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  test("falls back to slug order for unparseable dates", () => {
    const unparseable = article({ slug: "zeta", date: "not-a-date" });
    const parseable = article({ slug: "alpha", date: "2026-01-01T00:00:00Z" });

    expect(sortArticleSummariesDesc([unparseable, parseable]).map((a) => a.slug)).toEqual(["alpha", "zeta"]);
  });

  test("orders equal dates by slug", () => {
    const b = article({ slug: "b", date: "2026-01-01T00:00:00Z" });
    const a = article({ slug: "a", date: "2026-01-01T00:00:00Z" });

    expect(sortArticleSummariesDesc([b, a]).map((item) => item.slug)).toEqual(["a", "b"]);
  });

  test("does not mutate the input array", () => {
    const input = [
      article({ slug: "b", date: "2026-02-01T00:00:00Z" }),
      article({ slug: "a", date: "2026-03-01T00:00:00Z" }),
    ];
    const inputSlugs = input.map((item) => item.slug);

    sortArticleSummariesDesc(input);

    expect(input.map((item) => item.slug)).toEqual(inputSlugs);
  });
});

describe("fetchHomeArticlesAsync", () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { slug: "introduction", title: "Intro" },
            { title: "No slug" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("fetches the article list and drops entries without a slug", async () => {
    const articles = await fetchHomeArticlesAsync();

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}${ROUTES.CONTENT}?type=article`);
    expect(articles.map((a) => a.slug)).toEqual(["introduction"]);
  });
});