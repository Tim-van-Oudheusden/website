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
    const contentDirectory = resolve(process.cwd(), "..", "content");
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
});
