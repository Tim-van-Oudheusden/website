import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ArticleData, ArticleSummary } from "shared/articles";

import { ArticlesPage } from "../../../../../../front-end/src/features/articles/pages/articles-page";

import { queryFakeElements, uninstallFakeDom, type FakeDocument, type FakeElement } from "../../../../src/test/fake-dom";
import {
  fireFakePointer,
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  routeFetch,
  settleMicrotasks,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../../src/test/dom-harness";

// ArticlesPage runs its real hooks against the real content loader, driven
// through a routed fetch stub. Data-state permutations live in
// use-articles.test.tsx; this file covers what the page renders and does.

const ORIGINAL_FETCH = globalThis.fetch;
const LIST_URL = "/api/content?type=article";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  window.location.hash = "";
});

afterAll(() => {
  uninstallFakeDom();
});

function summary(slug: string, title: string): ArticleSummary {
  return {
    title,
    description: `About ${title}`,
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "article",
    draft: false,
    category: slug === "introduction" ? "Introduction" : "Linux",
    slug,
  };
}

function article(slug: string, title: string, body: string): ArticleData {
  return { ...summary(slug, title), body };
}

const INTRODUCTION = article("introduction", "Introduction", "Welcome aboard.\n\n## Setup steps\n\nInstall things.");
const LINUX_SETUP = article("linux-setup", "Linux setup", "Partition the disk.");

function respond(body: unknown): () => Promise<Response> {
  return () => Promise.resolve(jsonResponse(body));
}

function mountArticlesPage(path = "/articles"): FakeMount {
  return mountIntoBody(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: "/articles", element: createElement(ArticlesPage) }),
        createElement(Route, { path: "/articles/:slug", element: createElement(ArticlesPage) }),
      ),
    ),
  );
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

/** Let `requestAnimationFrame` callbacks (fake: `setTimeout(0)`) run. */
async function flushAnimationFrames(): Promise<void> {
  await act(async () => {
    const { promise, resolve } = Promise.withResolvers<undefined>();

    setTimeout(() => {
      resolve(undefined);
    }, 0);

    await promise;
  });
}

function headingById(id: string): FakeElement {
  const heading = (document as unknown as FakeDocument).getElementById(id);

  if (heading === null) {
    throw new Error(`Expected a heading with id="${id}"`);
  }

  return heading;
}

describe("ArticlesPage states", () => {
  test("renders the listing loading state before the listing resolves", () => {
    globalThis.fetch = (() => new Promise<Response>(() => undefined)) as unknown as typeof globalThis.fetch;
    const page = mountArticlesPage();

    try {
      expect(page.container.textContent).toContain("Loading articles...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the listing error in place of the layout", async () => {
    routeFetch({
      [LIST_URL]: () => Promise.resolve(new Response("", { status: 503, statusText: "Service Unavailable" })),
    });

    const page = mountArticlesPage();

    try {
      await settle();

      expect(page.container.textContent).toContain("Request failed: Service Unavailable");
      expect(queryFakeElements(page.container, (el) => el.nodeName === "ARTICLE")).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the empty state when no articles are published", async () => {
    routeFetch({ [LIST_URL]: respond([]) });
    const page = mountArticlesPage();

    try {
      await settle();

      expect(page.container.textContent).toContain("No articles yet.");
      expect(queryFakeElements(page.container, (el) => el.nodeName === "ARTICLE")).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("shows the article loading state while the selected article is in flight", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction")]),
      "/api/content/introduction": () => new Promise<Response>(() => undefined),
    });

    const page = mountArticlesPage();

    try {
      await settle();

      expect(page.container.textContent).toContain("Loading article...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});

describe("ArticlesPage layout", () => {
  test("links every listed article in the sidebar and renders the selected one", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction"), summary("linux-setup", "Linux setup")]),
      "/api/content/linux-setup": respond(LINUX_SETUP),
    });

    const page = mountArticlesPage("/articles/linux-setup");

    try {
      await settle();

      const sidebarHrefs = queryFakeElements(page.container, (el) => el.nodeName === "A")
        .map((link) => link.getAttribute("href"));

      expect(sidebarHrefs).toContain("/articles/introduction");
      expect(sidebarHrefs).toContain("/articles/linux-setup");

      const [content] = queryFakeElements(page.container, (el) => el.nodeName === "ARTICLE");

      expect(content?.textContent).toContain("Linux setup");
      expect(content?.textContent).toContain("Partition the disk.");
      expect(content?.textContent).not.toContain("Welcome aboard.");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("activating the Articles trail on the default article keeps it without refetching", async () => {
    const requested = routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction")]),
      "/api/content/introduction": respond(INTRODUCTION),
    });
    const page = mountArticlesPage();

    try {
      await settle();
      const [trailButton] = queryFakeElements(
        page.container,
        (el) => el.nodeName === "BUTTON" && el.textContent === "Articles",
      );

      if (trailButton === undefined) {
        throw new Error("Expected the Articles trail button");
      }

      fireFakePointer(trailButton, "click");
      await settle();

      expect(page.container.textContent).toContain("Welcome aboard.");
      expect(requested).toEqual([LIST_URL, "/api/content/introduction"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("activating the Articles trail on a slugged article shows the default article", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction"), summary("linux-setup", "Linux setup")]),
      "/api/content/introduction": respond(INTRODUCTION),
      "/api/content/linux-setup": respond(LINUX_SETUP),
    });

    const page = mountArticlesPage("/articles/linux-setup");

    try {
      await settle();
      const [trailButton] = queryFakeElements(
        page.container,
        (el) => el.nodeName === "BUTTON" && el.textContent === "Articles",
      );

      if (trailButton === undefined) {
        throw new Error("Expected the Articles trail button");
      }

      fireFakePointer(trailButton, "click");
      await settle();

      const [content] = queryFakeElements(page.container, (el) => el.nodeName === "ARTICLE");

      expect(content?.textContent).toContain("Welcome aboard.");
      expect(content?.textContent).not.toContain("Partition the disk.");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("after the Articles trail, the sidebar link back to the slugged article still works", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction"), summary("linux-setup", "Linux setup")]),
      "/api/content/introduction": respond(INTRODUCTION),
      "/api/content/linux-setup": respond(LINUX_SETUP),
    });

    const page = mountArticlesPage("/articles/linux-setup");

    try {
      await settle();
      const [trailButton] = queryFakeElements(
        page.container,
        (el) => el.nodeName === "BUTTON" && el.textContent === "Articles",
      );

      if (trailButton === undefined) {
        throw new Error("Expected the Articles trail button");
      }

      fireFakePointer(trailButton, "click");
      await settle();

      const [linuxSetupLink] = queryFakeElements(
        page.container,
        (el) => el.nodeName === "A" && el.getAttribute("href") === "/articles/linux-setup",
      );

      if (linuxSetupLink === undefined) {
        throw new Error("Expected the Linux setup sidebar link");
      }

      fireFakePointer(linuxSetupLink, "click");
      await settle();

      const [content] = queryFakeElements(page.container, (el) => el.nodeName === "ARTICLE");

      expect(content?.textContent).toContain("Partition the disk.");
      expect(content?.textContent).not.toContain("Welcome aboard.");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});

describe("ArticlesPage deep links", () => {
  test("scrolls to the heading named by the URL hash once the article renders", async () => {
    window.location.hash = "#setup-steps";

    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction")]),
      "/api/content/introduction": respond(INTRODUCTION),
    });

    const page = mountArticlesPage();

    try {
      await settle();
      await flushAnimationFrames();

      expect(headingById("setup-steps").scrollIntoViewCalls).toEqual([{ behavior: "smooth", block: "start" }]);
      expect(window.location.hash).toBe("#setup-steps");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("does not scroll anywhere without a hash", async () => {
    routeFetch({
      [LIST_URL]: respond([summary("introduction", "Introduction")]),
      "/api/content/introduction": respond(INTRODUCTION),
    });

    const page = mountArticlesPage();

    try {
      await settle();
      await flushAnimationFrames();

      expect(headingById("setup-steps").scrollIntoViewCalls).toEqual([]);
      expect(window.location.hash).toBe("");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
