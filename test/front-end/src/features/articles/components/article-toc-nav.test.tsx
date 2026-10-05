import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ArticleTocNav } from "../../../../../../front-end/src/features/articles/components/article-toc-nav";
import type { ArticleTableOfContentsItem } from "../../../../../../front-end/src/features/articles/lib/article-toc";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TEXT,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../../../../../../front-end/src/features/articles/lib/articles-page-styles";

const TOC_ITEMS: ArticleTableOfContentsItem[] = [
  { id: "intro", text: "Intro", depth: 1 },
  { id: "setup", text: "Setup", depth: 2 },
  { id: "config", text: "Config", depth: 3 },
];

function renderNav(tocItems: ArticleTableOfContentsItem[], visibleTocHeadingIds: string[]): string {
  return renderToStaticMarkup(
    createElement(ArticleTocNav, { tocItems, visibleTocHeadingIds }),
  );
}

describe("ArticleTocNav", () => {
  test("renders the toc panel, title, and one link per heading", () => {
    const html = renderNav(TOC_ITEMS, []);

    expect(html).toContain(`<aside class="${ARTICLES_PAGE_LAYOUT_CLASSES.toc}">`);
    expect(html).toContain('aria-label="Table of contents"');
    expect(html).toContain(ARTICLES_PAGE_LAYOUT_CLASSES.panelBox);
    expect(html).toContain(ARTICLES_PAGE_TEXT.tocHeading);
    expect(html).toContain(`<h3 class="${ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocTitle}">`);
    expect(html).toContain('<ol class="mt-3 space-y-2">');

    for (const item of TOC_ITEMS) {
      expect(html).toContain(`href="#${item.id}"`);
      expect(html).toContain(item.text);
    }
  });

  test("marks the active heading link distinctly from inactive ones", () => {
    const html = renderNav(TOC_ITEMS, ["setup"]);

    const setupAnchor = /<a href="#setup" class="[^"]*">/.exec(html);
    const introAnchor = /<a href="#intro" class="[^"]*">/.exec(html);

    expect(setupAnchor).not.toBeNull();
    expect(introAnchor).not.toBeNull();

    const setupClasses = setupAnchor?.[0] ?? "";
    const introClasses = introAnchor?.[0] ?? "";

    expect(setupClasses).toContain(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkActive);
    expect(setupClasses).not.toContain(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkInactive);
    expect(introClasses).toContain(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkInactive);
    expect(introClasses).not.toContain(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkActive);
  });

  test("indents depth-3 links but not top-level links", () => {
    const html = renderNav(TOC_ITEMS, []);

    const configAnchor = /<a href="#config" class="([^"]*)">/.exec(html);
    const introAnchor = /<a href="#intro" class="([^"]*)">/.exec(html);

    expect(configAnchor?.[1]).toContain("pl-3");
    expect(introAnchor?.[1]).not.toContain("pl-3");
  });

  test("renders an empty list when there are no toc items", () => {
    const html = renderNav([], []);

    expect(html).toContain("<ol");
    expect(html).not.toContain("<li");
    expect(html).toContain(ARTICLES_PAGE_TEXT.tocHeading);
  });
});
