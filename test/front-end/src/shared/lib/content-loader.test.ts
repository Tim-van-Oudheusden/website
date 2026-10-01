import { afterEach, describe, expect, mock, test, type Mock } from "bun:test";
import { API_BASE, ROUTES, type ProjectFrontmatter } from "shared";
import type { ArticleData, ArticleSummary } from "shared/articles";
import {
  createMemoryContentLoader,
  httpContentLoader,
} from "../../../../../front-end/src/shared/lib/content-loader";
import { ApiError } from "../../../../../front-end/src/shared/lib/api";

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function articleSummary(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
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

function articleData(overrides: Partial<ArticleData> = {}): ArticleData {
  return {
    ...articleSummary(),
    body: "# Heading",
    ...overrides,
  };
}

function projectItem(overrides: Partial<ProjectFrontmatter & { body: string }> = {}): ProjectFrontmatter & { body: string } {
  return {
    title: "Project",
    description: "Description",
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "project",
    draft: false,
    slug: "project",
    coverImage: "/images/projects/project.svg",
    coverImageAlt: "Artwork",
    featured: false,
    projectOrder: 0,
    links: [],
    body: "# Project",
    ...overrides,
  };
}

function stubFetch(response: Response): Mock<typeof fetch> {
  const fetchMock = mock(() => Promise.resolve(response));
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function requestedPath(fetchMock: Mock<typeof fetch>): string {
  const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
  return url;
}

describe("httpContentLoader", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("listArticles requests the article list and drops entries without a slug", async () => {
    const fetchMock = stubFetch(jsonResponse([
      { slug: "introduction", title: "Intro" },
      { slug: "yoga-nidra", title: "Yoga Nidra" },
      { title: "Missing slug" },
    ]));

    const articles = await httpContentLoader.listArticles();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestedPath(fetchMock)).toBe(`${API_BASE}${ROUTES.CONTENT}?type=article`);
    expect(articles.map((article) => article.slug)).toEqual(["introduction", "yoga-nidra"]);
  });

  test("getArticle requests the content-by-slug route with the slug substituted", async () => {
    const fetchMock = stubFetch(jsonResponse({ slug: "introduction", title: "Intro", body: "# Heading" }));

    const article = await httpContentLoader.getArticle("introduction");

    expect(requestedPath(fetchMock)).toBe(
      `${API_BASE}${ROUTES.CONTENT_BY_SLUG.replace(":slug", "introduction")}`,
    );
    expect(article.slug).toBe("introduction");
    expect(article.body).toBe("# Heading");
  });

  test("listProjects requests the project list", async () => {
    const fetchMock = stubFetch(jsonResponse([]));

    await httpContentLoader.listProjects();

    expect(requestedPath(fetchMock)).toBe(`${API_BASE}${ROUTES.CONTENT}?type=project`);
  });

  test("getProject rejects with ApiError(404) for a slug that resolves to an article", async () => {
    stubFetch(jsonResponse({ slug: "introduction", title: "Intro", type: "article", body: "# Heading" }));

    try {
      await httpContentLoader.getProject("introduction");
      expect.unreachable("expected a 404 ApiError for an article slug");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

describe("createMemoryContentLoader", () => {
  test("lists articles and projects from the provided items", async () => {
    const loader = createMemoryContentLoader([
      articleData({ slug: "intro" }),
      articleData({ slug: "yoga" }),
      projectItem({ slug: "pi-sandbox" }),
    ]);

    const articles = await loader.listArticles();
    const projects = await loader.listProjects();

    expect(articles.map((item) => item.slug)).toEqual(["intro", "yoga"]);
    expect(projects.map((item) => item.slug)).toEqual(["pi-sandbox"]);
  });

  test("getArticle returns the matching article by slug", async () => {
    const loader = createMemoryContentLoader([articleData({ slug: "intro", body: "# Intro" })]);

    const article = await loader.getArticle("intro");

    expect(article.slug).toBe("intro");
    expect(article.body).toBe("# Intro");
  });

  test("getArticle rejects with ApiError(404) for an absent slug", async () => {
    const loader = createMemoryContentLoader([articleData({ slug: "intro" })]);

    try {
      await loader.getArticle("does-not-exist");
      expect.unreachable("expected a 404 ApiError for a missing article");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  test("getProject returns the matching project by slug", async () => {
    const loader = createMemoryContentLoader([projectItem({ slug: "pi-sandbox", body: "# Sandbox" })]);

    const project = await loader.getProject("pi-sandbox");

    expect(project.slug).toBe("pi-sandbox");
    expect(project.body).toBe("# Sandbox");
  });

  test("getProject rejects with ApiError(404) for an absent slug", async () => {
    const loader = createMemoryContentLoader([projectItem({ slug: "pi-sandbox" })]);

    try {
      await loader.getProject("missing");
      expect.unreachable("expected a 404 ApiError for a missing project");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});