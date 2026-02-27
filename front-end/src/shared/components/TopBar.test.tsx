import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { TopBar } from "./TopBar";

function renderTopBar(pathname = "/"): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [pathname] }, createElement(TopBar)),
  );
}

describe("TopBar", () => {
  test("shows the updated brand label in the left navbar title", () => {
    const html = renderTopBar();
    expect(html).toContain("Tim V.O.");
    expect(html).not.toContain(">Website<");
  });

  test("uses the same brown background as homepage surfaces", () => {
    const html = renderTopBar();
    expect(html).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(html).not.toContain("bg-background");
  });

  test("has no border or shadow distinction from page content", () => {
    const html = renderTopBar();
    expect(html).not.toMatch(/<header class="[^"]*border-b/);
    expect(html).not.toMatch(/<header class="[^"]*shadow-md/);
    expect(html).not.toMatch(/<header class="[^"]*transition-shadow/);
  });

  test("exposes a data-scrolled attribute for scroll-aware styling", () => {
    const html = renderTopBar();
    expect(html).toContain('data-scrolled="false"');
  });

  test("uses an enlarged navbar height and larger text/icon sizing", () => {
    const html = renderTopBar();
    expect(html).toContain("h-[4.2rem]");
    expect(html).toContain("text-[1.35rem]");
    expect(html).toContain("size-6");
  });

  test("uses medium-weight navbar labels with a +2px size bump", () => {
    const html = renderTopBar();
    expect(html).toContain("h-10 px-4 text-[18px] font-medium");
    expect(html).not.toContain("h-10 px-4 text-[18px] font-semibold");
    expect(html).not.toContain("font-bold");
  });

  test("underlines the currently active top navbar page", () => {
    const html = renderTopBar("/articles");
    const activeCount = (html.match(/data-active-nav=\"true\"/g) ?? []).length;

    expect(activeCount).toBe(1);
    expect(html).toContain("data-active-nav-text=\"true\"");
    expect(html).toContain("border-b-2");
    expect(html).toContain("border-[var(--adw-dark-4)]");
    expect(html).not.toContain("h-10 px-4 text-[18px] font-medium rounded-none border-b-2");
  });
});
