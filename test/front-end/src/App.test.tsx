import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "../../../front-end/src/App";

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
    expect(html).toContain("Reboot With Me");
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
});