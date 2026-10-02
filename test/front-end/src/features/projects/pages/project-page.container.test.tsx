import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ArticleData } from "shared/articles";
import type * as ProjectPageModule from "../../../../../../front-end/src/features/projects/pages/project-page";

import { uninstallFakeDom } from "../../../../src/test/fake-dom";
import {
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  settleMicrotasks,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../../src/test/dom-harness";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so it
// must be imported after the fake DOM is installed by the harness. ProjectPage
// uses its real hooks and is driven through the fetch stub, like
// content-loader.test.ts.
let ProjectPage: typeof ProjectPageModule.ProjectPage;

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod = await import("../../../../../../front-end/src/features/projects/pages/project-page");
  ProjectPage = mod.ProjectPage;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

function stubFetch(response: Response): void {
  globalThis.fetch = mock(() => Promise.resolve(response)) as unknown as typeof globalThis.fetch;
}

function projectItem(): ProjectPageModule.ProjectData {
  return {
    title: "Sweet App",
    description: "A sweet app",
    date: "2026-01-01T00:00:00Z",
    tags: ["automation"],
    status: "Shipped",
    type: "project",
    draft: false,
    slug: "sweet-app",
    coverImage: "/images/projects/sweet-app.svg",
    coverImageAlt: "Sweet App artwork.",
    featured: false,
    projectOrder: 0,
    links: [],
    body: "Sweet app body",
  };
}

function articleItem(): ArticleData {
  return {
    title: "Sweet App",
    description: "An article about sweet apps",
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "article",
    draft: false,
    category: "Linux",
    slug: "sweet-app",
    body: "# Sweet App",
  };
}

function mountProjectPage(): FakeMount {
  return mountIntoBody(
    createElement(
      MemoryRouter,
      { initialEntries: ["/projects/sweet-app"] },
      createElement(
        Routes,
        null,
        createElement(Route, { path: "/projects/:slug", element: createElement(ProjectPage) }),
      ),
    ),
  );
}

function pageText(page: FakeMount): string {
  return page.container.textContent;
}

describe("ProjectPage", () => {
  test("renders the loading state before the loader resolves", () => {
    const page = mountProjectPage();

    try {
      expect(pageText(page)).toContain("Loading project...");
      expect(pageText(page)).not.toContain("Project not found");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the not-found state when the slug resolves to an article document", async () => {
    stubFetch(jsonResponse(articleItem()));
    const page = mountProjectPage();

    try {
      await act(async () => { await settleMicrotasks(); });

      expect(pageText(page)).toContain("Project not found");
      expect(pageText(page)).toContain("Back to projects");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the error state when the loader transport throws", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("network exploded")),
    ) as unknown as typeof globalThis.fetch;
    const page = mountProjectPage();

    try {
      await act(async () => { await settleMicrotasks(); });

      expect(pageText(page)).toContain("Failed to load project");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("surfaces the message of a non-404 ApiError", async () => {
    stubFetch(jsonResponse({}, 500));
    const page = mountProjectPage();

    try {
      await act(async () => { await settleMicrotasks(); });

      expect(pageText(page)).toContain("Request failed");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the project page once the loader resolves", async () => {
    stubFetch(jsonResponse(projectItem()));
    const page = mountProjectPage();

    try {
      await act(async () => { await settleMicrotasks(); });

      const text = pageText(page);
      expect(text).toContain("Sweet App");
      expect(text).toContain("Back to projects");
      expect(text).toContain("Shipped");
      expect(text).not.toContain("Loading project...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("a late resolution after unmounting cannot corrupt a fresh mount", async () => {
    // Mounting with a fetch that never resolves and unmounting mid-flight is
    // the navigation-away path; the component's cancellation guard keeps the
    // settled response from touching any state afterwards.
    const { promise: fetchResult, resolve: resolveFetch } = Promise.withResolvers<Response>();
    globalThis.fetch = mock(() => fetchResult) as unknown as typeof globalThis.fetch;

    const cancelledPage = mountProjectPage();
    unmountFakeDomRoot(cancelledPage);
    resolveFetch(jsonResponse(projectItem()));
    await settleMicrotasks();

    // A fresh mount starts from loading; no stale project state leaks in.
    stubFetch(jsonResponse(projectItem()));
    const page = mountProjectPage();
    try {
      expect(pageText(page)).toContain("Loading project...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});