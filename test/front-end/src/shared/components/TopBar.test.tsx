import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { TopBar } from "../../../../../front-end/src/shared/components/top-bar";
import type { FakeMount } from "../../test/dom-harness";
import { findAllBySlot, findBySlot, fireFakePointer, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../test/dom-harness";
import type { FakeDocument, FakeElement } from "../../test/fake-dom";
import { queryFakeElements, triggerWindowEvent, uninstallFakeDom } from "../../test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  setScrollY(0);
});

afterAll(() => {
  uninstallFakeDom();
});

function renderTopBar(pathname = "/"): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [pathname] }, createElement(TopBar)),
  );
}

function setScrollY(offset: number): void {
  Object.defineProperty(window, "scrollY", { value: offset, configurable: true, writable: true });
}

function headerOf(mount: FakeMount): FakeElement {
  const [header] = queryFakeElements(mount.container, (el) => el.nodeName === "HEADER");

  if (header === undefined) {
    throw new Error("Expected the top bar <header>");
  }

  return header;
}

describe("TopBar", () => {
  test("renders the site logo as the brand and the main page links", () => {
    const html = renderTopBar();
    const brandLink = /<a [^>]*href="\/"[^>]*>\s*<img [^>]*>\s*<\/a>/.exec(html)?.[0];

    expect(brandLink).toContain('src="/images/logo.svg"');
    expect(brandLink).toContain('alt="Build with Tim"');
    expect(html).not.toContain("Tim V.O.");
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

describe("TopBar scroll state", () => {
  test("flips data-scrolled as the page scrolls away from and back to the top", () => {
    const mount = mountIntoBody(createElement(MemoryRouter, null, createElement(TopBar)));

    try {
      expect(headerOf(mount).getAttribute("data-scrolled")).toBe("false");

      setScrollY(120);

      act(() => {
        triggerWindowEvent("scroll");
      });

      expect(headerOf(mount).getAttribute("data-scrolled")).toBe("true");

      setScrollY(0);

      act(() => {
        triggerWindowEvent("scroll");
      });

      expect(headerOf(mount).getAttribute("data-scrolled")).toBe("false");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("reports an already-scrolled page on mount", () => {
    setScrollY(300);
    const mount = mountIntoBody(createElement(MemoryRouter, null, createElement(TopBar)));

    try {
      expect(headerOf(mount).getAttribute("data-scrolled")).toBe("true");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});

describe("TopBar mobile menu", () => {
  test("lists the site pages and closes once a page is chosen", () => {
    // The fake document stands in for the real one installed as a global.
    const fakeDocument = document as unknown as FakeDocument;
    const mount = mountIntoBody(createElement(MemoryRouter, null, createElement(TopBar)));

    try {
      const [menuButton] = queryFakeElements(
        mount.container,
        (el) => el.nodeName === "BUTTON" && el.textContent.includes("Open menu"),
      );

      if (menuButton === undefined) {
        throw new Error("Expected the mobile menu button");
      }

      fireFakePointer(menuButton, "click");

      const menu = findBySlot(fakeDocument.body, "sheet-content");
      const menuLinks = queryFakeElements(menu, (el) => el.nodeName === "A");

      expect(menuLinks.map((link) => link.getAttribute("href"))).toEqual(["/", "/articles", "/projects"]);

      const articlesLink = menuLinks[1];

      if (articlesLink === undefined) {
        throw new Error("Expected an Articles menu link");
      }

      fireFakePointer(articlesLink, "click");

      expect(findAllBySlot(fakeDocument.body, "sheet-content")).toEqual([]);
      const activeLinks = queryFakeElements(mount.container, (el) => el.getAttribute("data-active-nav") === "true");

      expect(activeLinks.map((link) => link.getAttribute("href"))).toEqual(["/articles"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
