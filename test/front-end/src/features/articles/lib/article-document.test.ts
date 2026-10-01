import { describe, expect, test } from "bun:test";
import { renderArticle } from "../../../../../../front-end/src/features/articles/lib/article-document";

const COMPLEX_MARKDOWN = `# Intro

## [Reference style][ref]
## Title with <span>inline html</span>
## ![Alt label](/assets/logo.svg) plus text

\`\`\`md
# This code heading should not be in TOC
\`\`\`

### Final section

[ref]: https://example.com
`;

describe("renderArticle", () => {
  test("renders html with every toc heading id present", () => {
    const { html, toc } = renderArticle(COMPLEX_MARKDOWN);

    expect(toc.length).toBe(5);
    for (const item of toc) {
      expect(html).toContain(`id="${item.id}"`);
    }
  });

  test("renders heading ids in the same order and set as the toc", () => {
    const { html, toc } = renderArticle(COMPLEX_MARKDOWN);
    const renderedIds = Array
      .from(html.matchAll(/<h[1-3][^>]*id="([^"]+)"/g))
      .map((match) => match[1]);

    expect(renderedIds).toEqual(toc.map((item) => item.id));
  });

  test("excludes fenced code headings from the toc and the rendered ids", () => {
    const { html, toc } = renderArticle(COMPLEX_MARKDOWN);

    expect(toc.map((item) => item.text)).not.toContain("This code heading should not be in TOC");
    expect(html).not.toContain("id=\"this-code-heading-should-not-be-in-toc\"");
  });

  test("never invents a position-suffixed heading id", () => {
    const { html } = renderArticle(COMPLEX_MARKDOWN);
    const renderedIds = Array
      .from(html.matchAll(/<h[1-3][^>]*id="([^"]+)"/g))
      .map((match) => match[1]);

    for (const id of renderedIds) {
      expect(id).not.toMatch(/-\d+-\d+$/);
    }
  });

  test("keeps duplicate and setext heading ids aligned across html and toc", () => {
    const markdown = "# Alpha\n# Alpha\n\nTitle\n===\n";
    const { html, toc } = renderArticle(markdown);

    expect(toc.map((item) => item.id)).toEqual(["alpha", "alpha-1", "title"]);
    for (const item of toc) {
      expect(html).toContain(`id="${item.id}"`);
    }
  });

  test("excludes headings deeper than the toc depth from ids and toc", () => {
    const markdown = "# One\n#### Four\n### Three\n";
    const { html, toc } = renderArticle(markdown);

    expect(toc.map((item) => item.id)).toEqual(["one", "three"]);
    expect(html).not.toContain("id=\"four\"");
  });
});