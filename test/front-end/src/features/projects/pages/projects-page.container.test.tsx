import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { MemoryRouter } from "react-router";
import type { ProjectFrontmatter } from "shared";

import { ProjectsPage } from "../../../../../../front-end/src/features/projects/pages/projects-page";

import { queryFakeElements, uninstallFakeDom, type FakeElement } from "../../../../src/test/fake-dom";
import {
  findAllBySlot,
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  settleMicrotasks,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../../src/test/dom-harness";

// ProjectsPage uses its real hooks and the real content loader, driven through
// the fetch stub like project-page.container.test.tsx.

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
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

function project(overrides: Partial<ProjectFrontmatter> = {}): ProjectFrontmatter {
  return {
    title: "Project",
    description: "Project description",
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "project",
    draft: false,
    slug: "project",
    coverImage: "/images/projects/project.svg",
    coverImageAlt: "Project artwork.",
    featured: false,
    projectOrder: 0,
    links: [],
    ...overrides,
  };
}

async function mountLoadedProjectsPage(response: Response): Promise<FakeMount> {
  stubFetch(response);
  const page = mountIntoBody(createElement(MemoryRouter, null, createElement(ProjectsPage)));
  await act(async () => { await settleMicrotasks(); });
  return page;
}

function section(page: FakeMount, headingId: string): FakeElement | undefined {
  const [found] = queryFakeElements(page.container, (el) => el.getAttribute("aria-labelledby") === headingId);
  return found;
}

function cardTitles(region: FakeElement | undefined): string[] {
  if (region === undefined) throw new Error("Expected the project section to render");
  return findAllBySlot(region, "card-title").map((title) => title.textContent);
}

describe("ProjectsPage", () => {
  test("renders the loading state before the listing resolves", () => {
    globalThis.fetch = mock(() => new Promise<Response>(() => undefined)) as unknown as typeof globalThis.fetch;
    const page = mountIntoBody(createElement(MemoryRouter, null, createElement(ProjectsPage)));

    try {
      expect(page.container.textContent).toContain("Loading projects...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("surfaces the message of an ApiError from the listing", async () => {
    const page = await mountLoadedProjectsPage(
      new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }),
    );

    try {
      expect(page.container.textContent).toContain("Request failed: Internal Server Error");
      expect(page.container.textContent).not.toContain("Loading projects...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("falls back to a generic message when the transport fails", async () => {
    globalThis.fetch = mock(() => Promise.reject(new TypeError("network dropped"))) as unknown as typeof globalThis.fetch;
    const page = mountIntoBody(createElement(MemoryRouter, null, createElement(ProjectsPage)));

    try {
      await act(async () => { await settleMicrotasks(); });

      expect(page.container.textContent).toContain("Failed to load projects");
      expect(page.container.textContent).not.toContain("network dropped");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the empty state when no projects are published", async () => {
    const page = await mountLoadedProjectsPage(jsonResponse([]));

    try {
      expect(page.container.textContent).toContain("Project case studies are being prepared.");
      expect(section(page, "featured-project-heading")).toBeUndefined();
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("features the flagged project with a case-study panel and lists the rest below", async () => {
    const page = await mountLoadedProjectsPage(jsonResponse([
      project({ slug: "older", title: "Older", date: "2025-01-01T00:00:00Z" }),
      project({ slug: "flagship", title: "Flagship", featured: true, info: "Why the flagship exists." }),
      project({ slug: "newer", title: "Newer", date: "2026-06-01T00:00:00Z" }),
    ]));

    try {
      const featured = section(page, "featured-project-heading");
      expect(cardTitles(featured)).toEqual(["Flagship"]);
      expect(featured?.textContent).toContain("Why this matters");
      expect(featured?.textContent).toContain("Why the flagship exists.");
      const [caseStudyLink] = queryFakeElements(
        page.container,
        (el) => el.nodeName === "A" && el.textContent === "Read the case study",
      );
      expect(caseStudyLink?.getAttribute("href")).toBe("/projects/flagship");

      // Gallery: every non-featured project, newest first.
      expect(cardTitles(section(page, "more-projects-heading"))).toEqual(["Newer", "Older"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("the case-study panel falls back to the description and the gallery is omitted for a lone project", async () => {
    const page = await mountLoadedProjectsPage(jsonResponse([
      project({ slug: "solo", title: "Solo", description: "The only project so far." }),
    ]));

    try {
      const featured = section(page, "featured-project-heading");
      expect(cardTitles(featured)).toEqual(["Solo"]);
      expect(featured?.textContent).toContain("Why this matters");
      expect(featured?.textContent).toContain("The only project so far.");
      expect(section(page, "more-projects-heading")).toBeUndefined();
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("explicit priority slots fill the featured area in slot order instead of the case-study panel", async () => {
    const page = await mountLoadedProjectsPage(jsonResponse([
      project({ slug: "second", title: "Second", prioritySlot: 2 }),
      project({ slug: "gallery", title: "Gallery" }),
      project({ slug: "first", title: "First", prioritySlot: 1 }),
    ]));

    try {
      const featured = section(page, "featured-project-heading");
      expect(cardTitles(featured)).toEqual(["First", "Second"]);
      expect(featured?.textContent).not.toContain("Why this matters");
      expect(cardTitles(section(page, "more-projects-heading"))).toEqual(["Gallery"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
