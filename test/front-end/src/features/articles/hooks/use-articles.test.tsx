import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";

import type { ArticleData, ArticleSummary } from "shared/articles";

import type { UseArticlesResult } from "../../../../../../front-end/src/features/articles/hooks/use-articles";
import { useArticles } from "../../../../../../front-end/src/features/articles/hooks/use-articles";
import {
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  routeFetch,
  settleMicrotasks,
  unmountFakeDomRoot,
} from "../../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../../src/test/fake-dom";

// useArticles runs against the real content loader, driven through a routed
// fetch stub like content-loader.test.ts.

const ORIGINAL_FETCH = globalThis.fetch;
const LIST_URL = "/api/content?type=article";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

function summary(slug: string, overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    title: `Title ${slug}`,
    description: `About ${slug}`,
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    category: "Linux",
    slug,
    ...overrides,
  };
}

function article(slug: string): ArticleData {
  return { ...summary(slug), body: `# ${slug}` };
}

function respond(body: unknown): () => Promise<Response> {
  return () => Promise.resolve(jsonResponse(body));
}

function failWith(status: number, statusText: string): () => Promise<Response> {
  return () => Promise.resolve(new Response(statusText, { status, statusText }));
}

interface Probe {
  latest: () => UseArticlesResult;
  cleanup: () => void;
}

function mountProbe(urlSlug?: string): Probe {
  const latestRef: { current: UseArticlesResult | null } = { current: null };

  function ArticlesProbe(): null {
    latestRef.current = useArticles(urlSlug);

    return null;
  }

  const mount = mountIntoBody(createElement(ArticlesProbe));

  return {
    latest: () => {
      if (latestRef.current === null) {
        throw new Error("Probe has not rendered");
      }

      return latestRef.current;
    },
    cleanup: () => {
      unmountFakeDomRoot(mount);
    },
  };
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

describe("useArticles listing", () => {
  test("starts loading the listing with nothing selected", () => {
    globalThis.fetch = (() => new Promise<Response>(() => undefined)) as unknown as typeof globalThis.fetch;
    const probe = mountProbe();

    try {
      expect(probe.latest().loadingArticles).toBe(true);
      expect(probe.latest().selectedSlug).toBeNull();
      expect(probe.latest().selectedArticle).toBeNull();
    } finally {
      probe.cleanup();
    }
  });

  test("selects and loads the introduction by default", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("linux-setup", { date: "2026-06-01T00:00:00Z" }), summary("introduction")]),
      "/api/content/introduction": respond(article("introduction")),
    });

    const probe = mountProbe();

    try {
      await settle();

      const result = probe.latest();

      expect(result.loadingArticles).toBe(false);
      expect(result.articles.map((item) => item.slug)).toEqual(["linux-setup", "introduction"]);
      expect(result.selectedSlug).toBe("introduction");
      expect(result.selectedArticle?.body).toBe("# introduction");
      expect(result.loadingArticle).toBe(false);
      expect(result.articleError).toBeNull();
    } finally {
      probe.cleanup();
    }
  });

  test("without an introduction the newest article is the default", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("older", { date: "2025-01-01T00:00:00Z" }), summary("newer")]),
      "/api/content/newer": respond(article("newer")),
    });

    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().selectedSlug).toBe("newer");
      expect(probe.latest().selectedArticle?.slug).toBe("newer");
    } finally {
      probe.cleanup();
    }
  });

  test("the URL slug wins over the default selection", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction"), summary("linux-setup")]),
      "/api/content/introduction": respond(article("introduction")),
      "/api/content/linux-setup": respond(article("linux-setup")),
    });

    const probe = mountProbe("linux-setup");

    try {
      await settle();

      expect(probe.latest().selectedSlug).toBe("linux-setup");
      expect(probe.latest().selectedArticle?.slug).toBe("linux-setup");
    } finally {
      probe.cleanup();
    }
  });

  test("a URL slug loads only that article, without fetching the default first", async () => {
    const requested = routeFetch({
      [LIST_URL]: respond([summary("introduction"), summary("linux-setup")]),
      "/api/content/introduction": respond(article("introduction")),
      "/api/content/linux-setup": respond(article("linux-setup")),
    });
    const probe = mountProbe("linux-setup");

    try {
      await settle();

      expect(probe.latest().selectedArticle?.slug).toBe("linux-setup");
      expect(requested).toEqual([LIST_URL, "/api/content/linux-setup"]);
    } finally {
      probe.cleanup();
    }
  });

  test("an empty listing selects nothing and never requests an article", async () => {
    const requested = routeFetch({ [LIST_URL]: respond([]) });
    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().loadingArticles).toBe(false);
      expect(probe.latest().articles).toEqual([]);
      expect(probe.latest().selectedSlug).toBeNull();
      expect(probe.latest().selectedArticle).toBeNull();
      expect(probe.latest().loadingArticle).toBe(false);
      expect(requested).toEqual([LIST_URL]);
    } finally {
      probe.cleanup();
    }
  });

  test("surfaces the message of an ApiError from the listing", async () => {
    routeFetch({ [LIST_URL]: failWith(500, "Internal Server Error") });
    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().loadingArticles).toBe(false);
      expect(probe.latest().listError).toBe("Request failed: Internal Server Error");
    } finally {
      probe.cleanup();
    }
  });

  test("falls back to a generic listing error when the transport fails", async () => {
    routeFetch({ [LIST_URL]: () => Promise.reject(new TypeError("network dropped")) });
    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().listError).toBe("Failed to load articles");
    } finally {
      probe.cleanup();
    }
  });
});

describe("useArticles selected article", () => {
  test("surfaces the message of an ApiError from the article request", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction")]),
      "/api/content/introduction": failWith(404, "Not Found"),
    });

    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().articleError).toBe("Request failed: Not Found");
      expect(probe.latest().selectedArticle).toBeNull();
      expect(probe.latest().loadingArticle).toBe(false);
    } finally {
      probe.cleanup();
    }
  });

  test("falls back to a generic article error when the transport fails", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction")]),
      "/api/content/introduction": () => Promise.reject(new TypeError("network dropped")),
    });

    const probe = mountProbe();

    try {
      await settle();

      expect(probe.latest().articleError).toBe("Failed to load article");
    } finally {
      probe.cleanup();
    }
  });

  test("selectSlug loads the new article and clears a previous article error", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction"), summary("linux-setup")]),
      "/api/content/introduction": failWith(404, "Not Found"),
      "/api/content/linux-setup": respond(article("linux-setup")),
    });

    const probe = mountProbe();

    try {
      await settle();
      expect(probe.latest().articleError).toBe("Request failed: Not Found");

      act(() => {
        probe.latest().selectSlug("linux-setup");
      });

      expect(probe.latest().loadingArticle).toBe(true);
      expect(probe.latest().articleError).toBeNull();

      await settle();
      expect(probe.latest().selectedSlug).toBe("linux-setup");
      expect(probe.latest().selectedArticle?.slug).toBe("linux-setup");
      expect(probe.latest().loadingArticle).toBe(false);
    } finally {
      probe.cleanup();
    }
  });

  test("selectSlug is not reverted while the URL still names another slug", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction"), summary("linux-setup")]),
      "/api/content/introduction": respond(article("introduction")),
      "/api/content/linux-setup": respond(article("linux-setup")),
    });

    const probe = mountProbe("linux-setup");

    try {
      await settle();

      act(() => {
        probe.latest().selectSlug("introduction");
      });

      await settle();

      expect(probe.latest().selectedSlug).toBe("introduction");
      expect(probe.latest().selectedArticle?.slug).toBe("introduction");
    } finally {
      probe.cleanup();
    }
  });

  test("a superseded article response that settles late is ignored", async () => {
    const slowIntroduction = Promise.withResolvers<Response>();

    routeFetch({
      [LIST_URL]: respond([summary("introduction"), summary("linux-setup")]),
      "/api/content/introduction": () => slowIntroduction.promise,
      "/api/content/linux-setup": respond(article("linux-setup")),
    });

    const probe = mountProbe();

    try {
      await settle();

      // The introduction request is still in flight when the reader moves on.
      act(() => {
        probe.latest().selectSlug("linux-setup");
      });

      await settle();
      expect(probe.latest().selectedArticle?.slug).toBe("linux-setup");

      slowIntroduction.resolve(jsonResponse(article("introduction")));
      await settle();

      expect(probe.latest().selectedSlug).toBe("linux-setup");
      expect(probe.latest().selectedArticle?.slug).toBe("linux-setup");
      expect(probe.latest().loadingArticle).toBe(false);
    } finally {
      probe.cleanup();
    }
  });
});
