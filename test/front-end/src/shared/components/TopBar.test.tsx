import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { TopBar } from "../../../../../front-end/src/shared/components/top-bar";

function renderTopBar(pathname = "/"): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [pathname] }, createElement(TopBar)),
  );
}

describe("TopBar", () => {
  test("renders the site brand and the main page links", () => {
    const html = renderTopBar();

    expect(html).toContain("Tim V.O.");
    expect(html).toContain("Home");
    expect(html).toContain("Articles");
    expect(html).toContain("Projects");
  });

  test("links the site pages to their routes", () => {
    const html = renderTopBar();

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/articles"');
    expect(html).toContain('href="/projects"');
  });

  test("exposes a data-scrolled attribute for scroll-aware styling", () => {
    const html = renderTopBar();

    expect(html).toContain('data-scrolled="false"');
  });

  test("marks exactly the currently active top navbar page", () => {
    const html = renderTopBar("/articles");
    const activeCount = (html.match(/data-active-nav="true"/g) ?? []).length;

    expect(activeCount).toBe(1);
    expect(html).toContain('data-active-nav-text="true"');
    expect(html).toContain('data-active-nav="false"');
  });
});