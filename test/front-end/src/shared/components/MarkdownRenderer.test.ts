import { describe, expect, spyOn, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownRenderer } from "../../../../../front-end/src/shared/components/markdown-renderer";

describe("MarkdownRenderer", () => {
  test("is exported as a memoized React component", () => {
    // React.memo wraps the component in an object with a type property
    expect(typeof MarkdownRenderer).toBe("object");
    expect(MarkdownRenderer).toHaveProperty("type");
    expect(typeof (MarkdownRenderer as unknown as { type: unknown }).type).toBe("function");
  });

  test("renders markdown image syntax as an img element", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "![Tracking pixel](/content-assets/images/pixel.gif)",
      }),
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="/content-assets/images/pixel.gif"');
  });

  test("applies readable markdown body defaults for size and spacing", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "Hello world",
      }),
    );

    expect(html).toContain("prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed");
  });

  test("adds stable heading ids and heading scroll margin for in-page TOC links", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "## Start Here\n### Deep Dive\n## Start Here",
      }),
    );

    expect(html).toContain('h2 id="start-here"');
    expect(html).toContain('h3 id="deep-dive"');
    expect(html).toContain('h2 id="start-here-1"');
    expect(html).toContain("scroll-mt-[5.25rem]");
  });

  test("adds heading ids for H1 so TOC links navigate correctly", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "# Overview\n## Details",
      }),
    );

    expect(html).toContain('h1 id="overview"');
    expect(html).toContain('h2 id="details"');
  });

  test("uses unicode-safe ids and supports setext headings", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "Section with *emphasis* and `code`\n---\n## Déjà vu & résumé\n## 你好 世界",
      }),
    );

    expect(html).toContain('h2 id="section-with-emphasis-and-code"');
    expect(html).toContain('h2 id="déjà-vu-résumé"');
    expect(html).toContain('h2 id="你好-世界"');
  });

  test("renders Obsidian quote callouts as a distinct callout block", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> [!quote]\n> The future is image-based operating systems.",
      }),
    );

    expect(html).toContain('data-callout-type="quote"');
    expect(html).not.toContain("[!quote]");
  });

  test("keeps an image that opens an Obsidian callout body", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: "> [!note]\n> ![Diagram](/d.png)" }),
    );

    expect(html).toContain('data-callout-type="note"');
    expect(html).toContain('src="/d.png"');
  });

  test("does not forward react-markdown's node prop to DOM elements", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: "[x](https://e.com) `c` ![Logo](/l.png)\n\n> quote" }),
    );

    expect(html).not.toContain("node=");
  });

  test("keeps regular blockquotes as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> This is a regular quote block.",
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test("keeps blockquotes whose first child is a list as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> - item one\n> - item two",
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test("keeps blockquotes whose first paragraph starts with emphasis as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> *emphasis first*\n> rest of quote",
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test("falls back to a slugified id and logs when a heading position is not in the toc set", () => {
    const errorSpy = spyOn(console, "error");

    try {
      const html = renderToStaticMarkup(
        createElement(MarkdownRenderer, {
          content: "# Top\n\n  ## Indented Heading\n\nbody",
        }),
      );

      expect(html).toContain('h1 id="top"');
      expect(html).toContain('h2 id="indented-heading"');
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
