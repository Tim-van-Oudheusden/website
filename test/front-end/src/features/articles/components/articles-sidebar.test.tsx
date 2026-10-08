import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { ARTICLE_CATEGORIES } from "shared";
import type { ArticleSummary } from "shared/articles";

import { ArticlesSidebar } from "../../../../../../front-end/src/features/articles/components/articles-sidebar";
import { fireFakePointer, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../test/dom-harness";
import type { FakeElement } from "../../../test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../test/fake-dom";

const FIXTURE_ARTICLES: ArticleSummary[] = [
  {
    title: "My operating system is a container image, yes, really",
    description: "A container desktop.",
    date: "2026-01-01",
    tags: ["Linux"],
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category: "Linux",
    slug: "my-operating-system-is-a-container-image-yes-really",
  },
  {
    title: "Introduction",
    description: "About the site.",
    date: "2026-02-02",
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category: "Introduction",
    slug: "introduction",
  },
];

function renderSidebar(selectedSlug: string | null = null): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ArticlesSidebar, { articles: FIXTURE_ARTICLES, selectedSlug }),
    ),
  );
}

describe("ArticlesSidebar", () => {
  test("groups articles under their frontmatter category", () => {
    const html = renderSidebar();

    expect(html).toContain("Introduction");
    expect(html).toContain("Linux");
    expect(html).toContain("my-operating-system-is-a-container-image-yes-really");
    expect(html).toContain("introduction");
  });

  test("links each article to its /articles/:slug page", () => {
    const html = renderSidebar();

    expect(html).toContain("/articles/my-operating-system-is-a-container-image-yes-really");
    expect(html).toContain("/articles/introduction");
  });

  test("marks the selected article with the selected-state styling", () => {
    const html = renderSidebar("introduction");

    expect(html).toContain("bg-[var(--adw-dark-5)]");
  });
});

/** Category trigger buttons keyed by their category label. */
function categoryTriggers(root: FakeElement): Record<string, FakeElement> {
  const triggers = queryFakeElements(root, (el) => el.nodeName === "BUTTON" && el.hasAttribute("aria-expanded"));

  return Object.fromEntries(
    triggers.map((trigger) => {
      const category = ARTICLE_CATEGORIES.find((name) => trigger.textContent.includes(name));

      if (category === undefined) {
        throw new Error(`Trigger without a category label: ${trigger.textContent}`);
      }

      return [category, trigger];
    }),
  );
}

function expandedStates(root: FakeElement): Record<string, string | null> {
  return Object.fromEntries(
    Object.entries(categoryTriggers(root)).map(([category, trigger]) => [category, trigger.getAttribute("aria-expanded")]),
  );
}

function articleHrefs(root: FakeElement): (string | null)[] {
  return queryFakeElements(root, (el) => el.nodeName === "A").map((link) => link.getAttribute("href"));
}

describe("ArticlesSidebar category toggle", () => {
  beforeAll(async () => {
    await initFakeDomHarness();
  });

  afterAll(() => {
    uninstallFakeDom();
  });

  test("collapses only the clicked category and expands it again on a second click", () => {
    const mount = mountIntoBody(
      createElement(
        MemoryRouter,
        null,
        createElement(ArticlesSidebar, { articles: FIXTURE_ARTICLES, selectedSlug: null }),
      ),
    );

    try {
      const allExpanded = { "Introduction": "true", "Linux": "true", "Work": "true", "Personal Life": "true" };
      const bothArticles = ["/articles/introduction", "/articles/my-operating-system-is-a-container-image-yes-really"];

      expect(expandedStates(mount.container)).toEqual(allExpanded);
      expect(articleHrefs(mount.container).sort()).toEqual(bothArticles);

      const linuxTrigger = categoryTriggers(mount.container)["Linux"];

      if (linuxTrigger === undefined) {
        throw new Error("Expected a Linux category trigger");
      }

      fireFakePointer(linuxTrigger, "click");

      expect(expandedStates(mount.container)).toEqual({ ...allExpanded, Linux: "false" });
      expect(articleHrefs(mount.container)).toEqual(["/articles/introduction"]);

      fireFakePointer(linuxTrigger, "click");

      expect(expandedStates(mount.container)).toEqual(allExpanded);
      expect(articleHrefs(mount.container).sort()).toEqual(bothArticles);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
