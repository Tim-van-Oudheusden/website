import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import type { ArticleSummary } from "shared/articles";

import { TagPage } from "../../../../../../front-end/src/features/articles/pages/tag-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

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

function summary(slug: string, title: string, tags: string[], date: string): ArticleSummary {
  return {
    title,
    description: `About ${title}`,
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

const ARTICLES = [
  summary("old-images", "Old images", ["Docker"], "2025-01-01"),
  summary("flatpak", "Flatpak", ["Flatpak"], "2026-03-01"),
  summary("new-images", "New images", ["Bazzite", "Docker"], "2026-06-01"),
];

function mountTagPage(path: string): FakeMount {
  return mountIntoBody(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Routes, null, createElement(Route, { path: "/tags/:tag", element: createElement(TagPage) })),
    ),
  );
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

function linkHrefs(page: FakeMount): (string | null)[] {
  return queryFakeElements(page.container, (el) => el.nodeName === "A").map((link) => link.getAttribute("href"));
}

describe("TagPage", () => {
  test("lists only the articles carrying the tag, newest first, under the authored tag name", async () => {
    routeFetch({ [LIST_URL]: () => Promise.resolve(jsonResponse(ARTICLES)) });
    const page = mountTagPage("/tags/docker");

    try {
      await settle();

      const [heading] = queryFakeElements(page.container, (el) => el.nodeName === "H1");

      expect(heading?.textContent).toBe("Articles tagged Docker");

      expect(linkHrefs(page).filter((href) => href?.startsWith("/articles/"))).toEqual([
        "/articles/new-images",
        "/articles/old-images",
      ]);

      expect(page.container.textContent).toContain("About New images");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("opens the C++ page from its encoded path, apart from C and C#", async () => {
    const languages = [
      summary("c", "C", ["C"], "2026-01-01"),
      summary("cpp", "C++", ["C++"], "2026-02-01"),
      summary("cs", "C#", ["C#"], "2026-03-01"),
    ];

    routeFetch({ [LIST_URL]: () => Promise.resolve(jsonResponse(languages)) });
    const page = mountTagPage("/tags/c%2B%2B");

    try {
      await settle();

      const [heading] = queryFakeElements(page.container, (el) => el.nodeName === "H1");

      expect(heading?.textContent).toBe("Articles tagged C++");
      expect(linkHrefs(page)).toEqual(["/articles/cpp"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("says no article carries an unknown tag and links back to every article", async () => {
    routeFetch({ [LIST_URL]: () => Promise.resolve(jsonResponse(ARTICLES)) });
    const page = mountTagPage("/tags/kubernetes");

    try {
      await settle();

      expect(page.container.textContent).toContain("No articles are tagged kubernetes yet.");
      expect(linkHrefs(page)).toEqual(["/articles"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("shows the listing error in place of the list", async () => {
    routeFetch({
      [LIST_URL]: () => Promise.resolve(new Response("", { status: 503, statusText: "Service Unavailable" })),
    });

    const page = mountTagPage("/tags/docker");

    try {
      await settle();

      expect(page.container.textContent).toContain("Request failed: Service Unavailable");
      expect(linkHrefs(page)).toEqual([]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
