import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { API_BASE, ROUTES } from "shared";

import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import { HomePage } from "../../../../../../front-end/src/features/home/pages/home-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { fireFakePointer, initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeDocument, FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  window.location.hash = "";
});

afterAll(() => {
  uninstallFakeDom();
});

function renderHomePage(): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(HomePage)),
  );
}

function mountHomePage(): FakeMount {
  // The recent-posts and start-here sections load content on mount; an empty
  // listing keeps them quiet without touching the network.
  globalThis.fetch = mock(() => Promise.resolve(jsonResponse([]))) as unknown as typeof globalThis.fetch;

  return mountIntoBody(createElement(MemoryRouter, null, createElement(HomePage)));
}

function sectionElement(id: string): FakeElement {
  const element = (document as unknown as FakeDocument).getElementById(id);

  if (element === null) {
    throw new Error(`Expected a section with id="${id}"`);
  }

  return element;
}

function anchorTo(root: FakeElement, sectionId: string, label: string): FakeElement {
  const [anchor] = queryFakeElements(
    root,
    (el) => el.nodeName === "A" && el.getAttribute("href") === `#${sectionId}` && el.textContent.includes(label),
  );

  if (anchor === undefined) {
    throw new Error(`Expected an anchor to #${sectionId} labelled "${label}"`);
  }

  return anchor;
}

describe("HomePage", () => {
  test("mounts every section from HOME_SECTIONS config", () => {
    const html = renderHomePage();

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`id="${section.id}"`);
    }
  });

  test("renders each section heading wired to an aria-labelledby id", () => {
    const html = renderHomePage();

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`aria-labelledby="${section.id}-heading"`);
      expect(html.replaceAll("&#x27;", "'")).toContain(section.heading);
    }
  });

  test("wires the floating nav to the section list", () => {
    const html = renderHomePage();

    expect(html).toContain('aria-label="Page sections"');
    expect(html).toContain('data-slot="active-indicator"');
  });

  test("requests the article list once for all the sections that list articles", async () => {
    const requested = routeFetch({ [`${API_BASE}${ROUTES.CONTENT}?type=article`]: () => Promise.resolve(jsonResponse([])) });
    const page = mountIntoBody(createElement(MemoryRouter, null, createElement(HomePage)));

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(requested).toEqual([`${API_BASE}${ROUTES.CONTENT}?type=article`]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});

describe("HomePage section anchors", () => {
  test("a floating-nav anchor smooth-scrolls to its section and records the fragment", () => {
    const page = mountHomePage();

    try {
      const event = fireFakePointer(anchorTo(page.container, "proof", "conquer"), "click");

      expect(event.defaultPrevented).toBe(true);
      expect(sectionElement("proof").scrollIntoViewCalls).toEqual([{ behavior: "smooth", block: "start" }]);
      expect(window.location.hash).toBe("#proof");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("a section call-to-action scrolls to its target section", () => {
    const page = mountHomePage();

    try {
      fireFakePointer(anchorTo(page.container, "for-you", "Discover"), "click");

      expect(sectionElement("for-you").scrollIntoViewCalls).toEqual([{ behavior: "smooth", block: "start" }]);
      expect(window.location.hash).toBe("#for-you");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("leaves native hash navigation alone when the target section is missing", () => {
    const page = mountHomePage();

    try {
      const anchor = anchorTo(page.container, "proof", "conquer");

      sectionElement("proof").setAttribute("id", "proof-detached");

      const event = fireFakePointer(anchor, "click");

      expect(event.defaultPrevented).toBe(false);
      expect(sectionElement("proof-detached").scrollIntoViewCalls).toEqual([]);
      expect(window.location.hash).toBe("");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
