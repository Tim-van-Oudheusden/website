import { describe, expect, spyOn, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownRenderer } from "../../../../../front-end/src/shared/components/markdown-renderer";
import { extractMarkdownHeadings, TOC_MAX_DEPTH } from "../../../../../front-end/src/shared/lib/markdown-headings";

function renderedHeadingIds(html: string): string[] {
  return [...html.matchAll(/<h[1-3] id="([^"]*)"/g)].map((match) => match[1] ?? "");
}

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
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="/content-assets/images/pixel.gif"');
  });

  test("applies readable markdown body defaults for size and spacing", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "Hello world",
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain("prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed");
  });

  test("adds stable heading ids and heading scroll margin for in-page TOC links", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "## Start Here\n### Deep Dive\n## Start Here",
        headingLevelOffset: 0,
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
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain('h1 id="overview"');
    expect(html).toContain('h2 id="details"');
  });

  test("demotes every heading one level when the page title owns the h1, keeping the ids", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "# Overview\n## Details\n### Fine print",
        headingLevelOffset: 1,
      }),
    );

    expect(html).not.toContain("<h1");
    expect(html).toContain('h2 id="overview"');
    expect(html).toContain('h3 id="details"');
    expect(html).toContain('h4 id="fine-print"');
  });

  test("uses unicode-safe ids and supports setext headings", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "Section with *emphasis* and `code`\n---\n## Déjà vu & résumé\n## 你好 世界",
        headingLevelOffset: 0,
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
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain('data-callout-type="quote"');
    expect(html).not.toContain("[!quote]");
  });

  test("keeps an image that opens an Obsidian callout body", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: "> [!note]\n> ![Diagram](/d.png)", headingLevelOffset: 0 }),
    );

    expect(html).toContain('data-callout-type="note"');
    expect(html).toContain('src="/d.png"');
  });

  test("does not forward react-markdown's node prop to DOM elements", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, { content: "[x](https://e.com) `c` ![Logo](/l.png)\n\n> quote", headingLevelOffset: 0 }),
    );

    expect(html).not.toContain("node=");
  });

  test("keeps regular blockquotes as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> This is a regular quote block.",
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test("keeps blockquotes whose first child is a list as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> - item one\n> - item two",
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test("keeps blockquotes whose first paragraph starts with emphasis as blockquotes", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "> *emphasis first*\n> rest of quote",
        headingLevelOffset: 0,
      }),
    );

    expect(html).toContain("<blockquote");
    expect(html).not.toContain("data-callout-type");
  });

  test.each([
    ["an atx heading indented by one to three spaces", " # One\n  ## Two\n   ### Three"],
    ["a duplicate after an indented heading", "   ## Setup\n## Setup"],
    ["a setext heading with indented text", "  Title\n-----\n\nBody\n\n   Other\n   ==="],
    ["an image-only heading", "## ![Logo](/content-assets/images/logo.svg)\n## Logo"],
  ])("renders the same heading ids the TOC links to for %s", (_label, content) => {
    const errorSpy = spyOn(console, "error");

    try {
      const html = renderToStaticMarkup(createElement(MarkdownRenderer, { content, headingLevelOffset: 0 }));
      const tocIds = extractMarkdownHeadings(content, TOC_MAX_DEPTH).map((heading) => heading.id);

      expect(tocIds.length).toBeGreaterThan(0);
      expect(renderedHeadingIds(html)).toEqual(tocIds);
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("falls back to a slugified id and logs when a heading position is not in the toc set", () => {
    const errorSpy = spyOn(console, "error");

    try {
      const html = renderToStaticMarkup(
        createElement(MarkdownRenderer, {
          content: "# Top\n\n> ## Quoted Heading\n\nbody",
          headingLevelOffset: 0,
        }),
      );

      expect(html).toContain('h1 id="top"');
      expect(html).toContain('h2 id="quoted-heading"');
      expect(errorSpy).toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("uses the image alt text as the fallback id for an image-only heading outside the toc set", () => {
    const errorSpy = spyOn(console, "error");

    try {
      const html = renderToStaticMarkup(
        createElement(MarkdownRenderer, {
          content: "> ## ![Logo](/content-assets/images/logo.svg)",
          headingLevelOffset: 0,
        }),
      );

      expect(html).toContain('h2 id="logo"');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"Logo"'));
    } finally {
      errorSpy.mockRestore();
    }
  });
});
