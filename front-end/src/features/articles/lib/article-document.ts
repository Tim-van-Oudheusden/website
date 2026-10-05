import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownRenderer } from "@/shared/components/markdown-renderer";

import type { ArticleTableOfContentsItem } from "./article-toc";
import { extractArticleTableOfContents } from "./article-toc";

export interface RenderedArticle {
  /** Server-rendered article markup with heading ids matching `toc`. */
  html: string;
  toc: ArticleTableOfContentsItem[];
}

/**
 * Pure seam: full rendered HTML plus the table of contents that must match its
 * heading ids. Both derive from the same heading extraction, so a mismatch is
 * a structural bug rather than a cross-module drift.
 */
export function renderArticle(markdown: string): RenderedArticle {
  return {
    html: renderToStaticMarkup(createElement(MarkdownRenderer, { content: markdown })),
    toc: extractArticleTableOfContents(markdown),
  };
}
