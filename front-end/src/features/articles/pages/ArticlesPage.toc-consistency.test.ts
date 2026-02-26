import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MarkdownRenderer } from "@/shared/components/MarkdownRenderer";
import { extractArticleTableOfContents } from "./ArticlesPage";

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) {
    return markdown;
  }

  const closingFrontmatterIndex = markdown.indexOf("\n---\n", 4);
  if (closingFrontmatterIndex === -1) {
    return markdown;
  }

  return markdown.slice(closingFrontmatterIndex + 5);
}

describe("Articles TOC and rendered heading ids", () => {
  test("keeps TOC links aligned with rendered heading ids for all content markdown files", () => {
    const contentDirectory = resolve(import.meta.dir, "../../../../../content");
    const markdownFiles = readdirSync(contentDirectory).filter((fileName) => fileName.endsWith(".md"));

    for (const markdownFile of markdownFiles) {
      const markdownPath = resolve(contentDirectory, markdownFile);
      const markdownWithFrontmatter = readFileSync(markdownPath, "utf-8");
      const markdownBody = stripFrontmatter(markdownWithFrontmatter);
      const tocItems = extractArticleTableOfContents(markdownBody);
      const renderedHtml = renderToStaticMarkup(
        createElement(MarkdownRenderer, {
          content: markdownBody,
        }),
      );

      for (const tocItem of tocItems) {
        expect(renderedHtml).toContain(`id="${tocItem.id}"`);
      }
    }
  });

  test("keeps TOC ids aligned with rendered heading ids for complex heading markdown", () => {
    const markdownBody = `# Intro

## [Reference style][ref]
## Title with <span>inline html</span>
## ![Alt label](/assets/logo.svg) plus text

\`\`\`md
# This code heading should not be in TOC
\`\`\`

### Final section

[ref]: https://example.com
`;
    const tocItems = extractArticleTableOfContents(markdownBody);
    const renderedHtml = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: markdownBody,
      }),
    );
    const renderedHeadingIds = Array
      .from(renderedHtml.matchAll(/<h[1-3][^>]*id="([^"]+)"/g))
      .map((match) => match[1]);

    expect(tocItems.map((item) => item.id)).toEqual(renderedHeadingIds);
  });
});
