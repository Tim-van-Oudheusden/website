import { afterEach, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { App, AppRoutes } from "../../../front-end/src/App";

afterEach(() => {
  // The fake DOM is process-wide: undo the URL and the history entry state
  // `BrowserRouter` records on construction.
  window.location.pathname = "/";
  window.history.replaceState(null, "");
});

function renderRoute(pathname: string): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [pathname] },
      createElement(AppRoutes),
    ),
  );
}

describe("AppRoutes", () => {
  test("resolves / to the home page", () => {
    const html = renderRoute("/");

    expect(html).toContain('aria-label="Page sections"');
    expect(html).toMatch(/<section[^>]*aria-labelledby="start-heading"[\s\S]*?<h2 id="start-heading"/);
    expect(html).toMatch(/aria-labelledby="start-heading"[\s\S]*?href="#for-you"/);
  });

  test("resolves /projects to the projects list page", () => {
    const html = renderRoute("/projects");

    expect(html).toContain("Loading projects...");
  });

  test("resolves /projects/:slug to the project detail page", () => {
    const html = renderRoute("/projects/some-project");

    expect(html).toContain("Loading project...");
  });

  test("resolves /articles to the articles page", () => {
    const html = renderRoute("/articles");

    expect(html).toContain("Loading articles...");
  });

  test("resolves /articles/:slug to the articles page with a selected article", () => {
    const html = renderRoute("/articles/introduction");

    expect(html).toContain("Loading articles...");
  });

  test("resolves /now and /uses to their standalone pages", () => {
    expect(renderRoute("/now")).toContain("Loading page...");
    expect(renderRoute("/uses")).toContain("Loading page...");
  });
});

describe("App", () => {
  test("renders the top bar above the page for the browser's current URL", () => {
    window.location.pathname = "/projects";

    const html = renderToStaticMarkup(createElement(App));

    const headerAt = html.indexOf("<header");

    expect(html).toContain('src="/images/logo.svg"');
    expect(headerAt).toBeGreaterThanOrEqual(0);
    expect(headerAt).toBeLessThan(html.indexOf("Loading projects..."));
    expect(/<a [^>]*data-active-nav="true"[^>]*>/.exec(html)?.[0]).toContain('href="/projects"');
  });
});
