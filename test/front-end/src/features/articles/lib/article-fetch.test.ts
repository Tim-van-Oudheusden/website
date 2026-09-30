import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { API_BASE, ROUTES } from "shared";
import {
  fetchArticleBySlug,
  fetchArticleSummaries,
} from "../../../../../../front-end/src/features/articles/lib/article-fetch";
import { ApiError } from "../../../../../../front-end/src/shared/lib/api";

const originalFetch = globalThis.fetch;

describe("fetchArticleSummaries", () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { slug: "introduction", title: "Intro" },
            { slug: "yoga-nidra-a-way-to-be-at-peace-in-chaos", title: "Yoga Nidra" },
            { title: "Missing slug" },
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

  test("requests the article list and drops entries without a slug", async () => {
    const articles = await fetchArticleSummaries();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}${ROUTES.CONTENT}?type=article`);
    expect(articles.map((a) => a.slug)).toEqual([
      "introduction",
      "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    ]);
  });
});

describe("fetchArticleBySlug", () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ slug: "introduction", title: "Intro", body: "# Heading" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("requests the content-by-slug route with the slug substituted", async () => {
    const article = await fetchArticleBySlug("introduction");

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}${ROUTES.CONTENT_BY_SLUG.replace(":slug", "introduction")}`);
    expect(article.slug).toBe("introduction");
    expect(article.body).toBe("# Heading");
  });

  test("rejects with ApiError(404) for an absent slug", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Not Found", { status: 404, statusText: "Not Found" }),
      ),
    ) as typeof globalThis.fetch;

    try {
      await fetchArticleBySlug("does-not-exist");
      expect.unreachable("expected a 404 ApiError");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});