import { afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ArticleData } from "shared/articles";
import type { ProjectData } from "../../../../../../front-end/src/features/projects/pages/project-page";

interface ScriptedProjectState {
  project: ProjectData | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
}

/**
 * Hook call order inside ProjectPage: project, loading, notFound, error.
 * Keeping the harness positional means this list MUST mirror the component's
 * useState order — the same coupling ErrorBoundary's container test accepts
 * when it drives instance state directly.
 */
const HOOK_SLOTS: (keyof ScriptedProjectState)[] = ["project", "loading", "notFound", "error"];

const scripted: ScriptedProjectState = { project: null, loading: true, notFound: false, error: null };
let capturedEffect: (() => (() => void)) | null = null;
let nextSlot = 0;

let ProjectPage: ComponentType;

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  // Module-loading boundary: the react hooks mock must be in place before
  // project-page is evaluated, so it cannot be a static import (a static
  // import would capture the unmocked hooks; the content loader stays real
  // and is driven through the fetch stub, like content-loader.test.ts).
  const realReact = await import("react");
  void mock.module("react", () => ({
    ...realReact,
    useState(initial: unknown): [unknown, (value: unknown) => void] {
      void initial;
      const slot = HOOK_SLOTS[nextSlot];
      nextSlot += 1;
      if (slot === undefined) {
        throw new Error("ProjectPage called useState more times than scripted slots");
      }
      return [scripted[slot], (value) => { scripted[slot] = value; }];
    },
    useEffect(effect: () => (() => void)): void {
      capturedEffect = effect;
    },
  }));
  ({ ProjectPage } = await import("../../../../../../front-end/src/features/projects/pages/project-page"));
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

function renderProjectPage(): string {
  nextSlot = 0;
  return renderToStaticMarkup(
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

/** Invoke the effect the component mounted on its last render. */
function runEffect(): (() => void) | null {
  return capturedEffect?.();
}

/** Enough microticks for the fetch -> json -> guard -> setters chain to land. */
async function settleEffects(): Promise<void> {
  for (let index = 0; index < 25; index += 1) {
    await Promise.resolve();
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(response: Response): void {
  globalThis.fetch = () => Promise.resolve(response);
}

function projectItem(): ProjectData {
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

function resetState(): void {
  Object.assign(scripted, { project: null, loading: true, notFound: false, error: null });
}

describe("ProjectPage", () => {
  test("renders the loading state before the loader resolves", () => {
    resetState();
    const html = renderProjectPage();

    expect(html).toContain("Loading project...");
    expect(html).not.toContain("Project not found");
  });

  test("renders the not-found state when the slug resolves to an article document", async () => {
    const article = articleItem();
    stubFetch(jsonResponse(article));
    resetState();
    renderProjectPage();

    runEffect();
    await settleEffects();

    const html = renderProjectPage();
    expect(html).toContain("Project not found");
    expect(html).toContain("Back to projects");
  });

  test("renders the error state when the loader transport throws", async () => {
    globalThis.fetch = () => Promise.reject(new Error("network exploded"));
    resetState();
    renderProjectPage();

    runEffect();
    await settleEffects();

    expect(renderProjectPage()).toContain("Failed to load project");
  });

  test("surfaces the message of a non-404 ApiError", async () => {
    stubFetch(jsonResponse({}, 500));
    resetState();
    renderProjectPage();

    runEffect();
    await settleEffects();

    expect(renderProjectPage()).toContain("Request failed");
  });

  test("renders the project page once the loader resolves", async () => {
    stubFetch(jsonResponse(projectItem()));
    resetState();
    renderProjectPage();

    runEffect();
    await settleEffects();

    const html = renderProjectPage();
    expect(html).toContain("Sweet App");
    expect(html).toContain("Back to projects");
    expect(html).toContain("Shipped");
  });

  test("keeps the loading state after a load cancelled by unmount", async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    globalThis.fetch = () => new Promise<Response>((resolve) => { resolveFetch = resolve; });
    resetState();
    renderProjectPage();

    const cleanup = runEffect();
    // The route unmounts (e.g. navigation away) before the loader resolves.
    cleanup?.();
    resolveFetch?.(jsonResponse(projectItem()));
    await settleEffects();

    expect(renderProjectPage()).toContain("Loading project...");
  });
});

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