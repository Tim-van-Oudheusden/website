import { afterAll, afterEach, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";

import { act, createElement } from "react";
import { Link, MemoryRouter, Route, Routes } from "react-router";

import type { ArticleData } from "shared/articles";

import type * as ProjectPageModule from "../../../../../../front-end/src/features/projects/pages/project-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { fireFakePointer, initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

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
    socialImage: null,
    prioritySlot: null,
    role: null,
    created: null,
    info: null,
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
    socialImage: null,
    draft: false,
    homeRecommended: false,
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

function headingTexts(page: FakeMount, tagName: string): string[] {
  return queryFakeElements(page.container, (el) => el.tagName === tagName).map((el) => el.textContent);
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
      await act(async () => {
        await settleMicrotasks();
      });

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
      await act(async () => {
        await settleMicrotasks();
      });

      expect(pageText(page)).toContain("Failed to load project");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("surfaces the message of a non-404 ApiError", async () => {
    stubFetch(jsonResponse({}, 500));
    const page = mountProjectPage();

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(pageText(page)).toContain("Request failed");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the project page once the loader resolves", async () => {
    stubFetch(jsonResponse(projectItem()));
    const page = mountProjectPage();

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      const text = pageText(page);

      expect(text).toContain("Sweet App");
      expect(text).toContain("Back to projects");
      expect(text).toContain("Shipped");
      expect(text).not.toContain("Loading project...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("shows the project's calendar day to a reader west of UTC", async () => {
    // The ICU default time zone is fixed for the process, so stand in for a
    // reader in Los Angeles: a call that names no time zone gets theirs.
    const readerInLosAngeles = spyOn(Date.prototype, "toLocaleDateString").mockImplementation(function (
      this: Date,
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      return new Intl.DateTimeFormat(locales, { timeZone: "America/Los_Angeles", ...options }).format(this);
    });

    stubFetch(jsonResponse({ ...projectItem(), date: "2026-10-16" }));
    const page = mountProjectPage();

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      const shown = queryFakeElements(page.container, (el) => el.tagName === "TIME").map((el) => el.textContent);

      expect(shown).toEqual([new Intl.DateTimeFormat(undefined, { timeZone: "UTC" }).format(Date.UTC(2026, 9, 16))]);
    } finally {
      unmountFakeDomRoot(page);
      readerInLosAngeles.mockRestore();
    }
  });

  test("fires the view beacon once the project loads, but not on a not-found or error outcome", async () => {
    stubFetch(jsonResponse(projectItem()));
    const page = mountProjectPage();

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };
      const viewBeaconCalls = fetchMock.mock.calls.filter(([, init]) =>
        (init as RequestInit | undefined)?.method === "POST");

      expect(viewBeaconCalls).toHaveLength(1);
      expect(String(viewBeaconCalls[0]?.[0])).toContain("/views/sweet-app");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("keeps the header title the only h1 when the markdown body opens with its own `#` title", async () => {
    stubFetch(jsonResponse({ ...projectItem(), body: "# Sweet App\n\n## Approach\n\nHow it works." }));
    const page = mountProjectPage();

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(headingTexts(page, "H1")).toEqual(["Sweet App"]);
      expect(headingTexts(page, "H2")).toEqual(["Sweet App"]);
      expect(headingTexts(page, "H3")).toEqual(["Approach"]);
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

  test("following a router link from a missing project to another shows that project, not the stale not-found", async () => {
    // Same ProjectPage instance, new `:slug`: the earlier 404 must not stick,
    // and the next project shows the loading state until it arrives.
    const { promise: nextProject, resolve: resolveNextProject } = Promise.withResolvers<Response>();

    routeFetch({
      "/api/content/missing": () => Promise.resolve(jsonResponse({ error: "Not found" }, 404)),
      "/api/content/sweet-app": () => nextProject,
      "/api/views/sweet-app": () => Promise.resolve(new Response(null, { status: 204 })),
    });

    const page = mountIntoBody(
      createElement(
        MemoryRouter,
        { initialEntries: ["/projects/missing"] },
        createElement(Link, { to: "/projects/sweet-app" }, "Next project"),
        createElement(
          Routes,
          null,
          createElement(Route, { path: "/projects/:slug", element: createElement(ProjectPage) }),
        ),
      ),
    );

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(pageText(page)).toContain("Project not found");

      const nextLink = queryFakeElements(page.container, (el) => el.getAttribute("href") === "/projects/sweet-app")[0];

      if (nextLink === undefined) {
        throw new Error("Expected the link to the next project");
      }

      fireFakePointer(nextLink, "click");

      expect(pageText(page)).toContain("Loading project...");
      expect(pageText(page)).not.toContain("Project not found");

      await act(async () => {
        resolveNextProject(jsonResponse(projectItem()));
        await settleMicrotasks();
      });

      expect(headingTexts(page, "H1")).toEqual(["Sweet App"]);
      expect(pageText(page)).not.toContain("Project not found");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
