import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from "bun:test";

import type { ReactElement } from "react";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ArticleSummary } from "shared/articles";

import { RecommendedArticleCard } from "../../../../../../front-end/src/features/home/components/recommended-article-card";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { fireFakePointer, initFakeDomHarness, mountIntoBody, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  jest.useRealTimers();
});

function article(overrides: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    title: "Yoga Nidra, a way to be at peace in chaos",
    slug: "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    date: "2025-01-17",
    tags: [],
    type: "article",
    socialImage: "images/cover.png",
    draft: false,
    category: "Personal Life",
    description: "How Eastern methods can help in a western life",
    ...overrides,
  };
}

function cardElement(item: ArticleSummary): ReactElement {
  return createElement(MemoryRouter, null, createElement(RecommendedArticleCard, { article: item }));
}

function renderCard(item: ArticleSummary): string {
  return renderToStaticMarkup(cardElement(item));
}

/** Stand in for the browser Clipboard API (absent from the fake DOM). */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
}

function copyButton(mount: FakeMount): FakeElement {
  const [button] = queryFakeElements(mount.container, (el) => el.nodeName === "BUTTON");

  if (button === undefined) {
    throw new Error("Expected a copy-link button");
  }

  return button;
}

async function clickCopy(mount: FakeMount): Promise<void> {
  fireFakePointer(copyButton(mount), "click");

  await act(async () => {
    await settleMicrotasks();
  });
}

describe("RecommendedArticleCard", () => {
  test("links to the article, named by its h3 title", () => {
    const html = renderCard(article());
    const titleId = /<h3 id="([^"]+)"[^>]*>Yoga Nidra, a way to be at peace in chaos<\/h3>/.exec(html)?.[1];
    const link = /<a [^>]*>/.exec(html)?.[0] ?? "";

    expect(titleId).toBeDefined();
    expect(link).toContain('href="/articles/yoga-nidra-a-way-to-be-at-peace-in-chaos"');
    expect(link).toContain(`aria-labelledby="${String(titleId)}"`);
  });

  test("shows the date and category as the link's description", () => {
    const html = renderCard(article());
    const metaId = /<a [^>]*aria-describedby="([^"]+)"/.exec(html)?.[1];

    expect(html).toMatch(new RegExp(`<p id="${String(metaId)}"[^>]*>January 17th, 2025 — Personal Life</p>`));
  });

  test("shows the social image from the content asset path as decoration", () => {
    expect(renderCard(article())).toMatch(/<img src="\/content-assets\/images\/cover.png" alt=""/);
  });

  test("falls back to a category panel when the article has no social image", () => {
    const html = renderCard(article({ socialImage: null, category: "Introduction", title: "Introduction", slug: "introduction" }));

    expect(html).not.toContain("<img");
    expect(html).toMatch(/<div aria-hidden="true"[^>]*><span[^>]*>Introduction<\/span><\/div>/);
  });
});

describe("RecommendedArticleCard copy link", () => {
  test("copies the absolute article URL and announces it, then resets after two seconds", async () => {
    const written: string[] = [];

    stubClipboard((text) => {
      written.push(text);

      return Promise.resolve();
    });

    jest.useFakeTimers();
    const mount = mountIntoBody(cardElement(article()));

    try {
      expect(copyButton(mount).textContent).toContain("Copy link");

      await clickCopy(mount);

      expect(written).toEqual(["http://localhost/articles/yoga-nidra-a-way-to-be-at-peace-in-chaos"]);
      expect(copyButton(mount).textContent).toContain("Copied to clipboard");
      expect(queryFakeElements(mount.container, (el) => el.getAttribute("aria-live") === "polite")[0]?.textContent).toBe("Link copied to clipboard");

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(copyButton(mount).textContent).toContain("Copy link");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("says so when the browser refuses the copy", async () => {
    stubClipboard(() => Promise.reject(new Error("NotAllowedError")));
    const mount = mountIntoBody(cardElement(article()));

    try {
      await clickCopy(mount);

      expect(copyButton(mount).textContent).toContain("Couldn't copy link");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
