import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { API_BASE, ROUTES } from "shared";
import { fetchHomeArticlesAsync } from "../../../../../../front-end/src/features/home/lib/home-articles";

const originalFetch = globalThis.fetch;

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