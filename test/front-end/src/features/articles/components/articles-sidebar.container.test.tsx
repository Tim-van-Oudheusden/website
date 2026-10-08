import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { MemoryRouter } from "react-router";

import type { ArticleSummary } from "shared/articles";

import { ArticlesSidebar } from "../../../../../../front-end/src/features/articles/components/articles-sidebar";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findAllBySlot, fireFakePointer, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

// The category open/closed state only changes through a trigger click, so it
// is exercised here against a mounted sidebar rather than static markup.

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

function summary(slug: string, title: string, category: ArticleSummary["category"]): ArticleSummary {
  return {
    title,
    description: `About ${title}`,
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category,
    slug,
  };
}

const ARTICLES: ArticleSummary[] = [
  summary("introduction", "Introduction", "Introduction"),
  summary("linux-setup", "Linux setup", "Linux"),
];

function mountSidebar(): FakeMount {
  return mountIntoBody(
    createElement(MemoryRouter, null, createElement(ArticlesSidebar, { articles: ARTICLES, selectedSlug: null })),
  );
}

function triggerFor(mount: FakeMount, category: string): FakeElement {
  const trigger = findAllBySlot(mount.container, "collapsible-trigger")
    .find((element) => element.textContent.includes(category));

  if (trigger === undefined) {
    throw new Error(`No collapsible trigger for category "${category}"`);
  }

  return trigger;
}

function articleLinkHrefs(mount: FakeMount): (string | null)[] {
  return queryFakeElements(mount.container, (element) => element.nodeName === "A")
    .map((element) => element.getAttribute("href"));
}

describe("ArticlesSidebar category toggle", () => {
  test("starts with every category expanded", () => {
    const mount = mountSidebar();

    try {
      expect(triggerFor(mount, "Introduction").getAttribute("aria-expanded")).toBe("true");
      expect(triggerFor(mount, "Linux").getAttribute("aria-expanded")).toBe("true");
      expect(articleLinkHrefs(mount)).toEqual(["/articles/introduction", "/articles/linux-setup"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("clicking a category trigger collapses only that category", () => {
    const mount = mountSidebar();

    try {
      fireFakePointer(triggerFor(mount, "Linux"), "click");

      expect(triggerFor(mount, "Linux").getAttribute("aria-expanded")).toBe("false");
      expect(triggerFor(mount, "Introduction").getAttribute("aria-expanded")).toBe("true");
      expect(articleLinkHrefs(mount)).toEqual(["/articles/introduction"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("clicking a collapsed category trigger expands it again", () => {
    const mount = mountSidebar();

    try {
      fireFakePointer(triggerFor(mount, "Linux"), "click");
      fireFakePointer(triggerFor(mount, "Linux"), "click");

      expect(triggerFor(mount, "Linux").getAttribute("aria-expanded")).toBe("true");
      expect(articleLinkHrefs(mount)).toEqual(["/articles/introduction", "/articles/linux-setup"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
