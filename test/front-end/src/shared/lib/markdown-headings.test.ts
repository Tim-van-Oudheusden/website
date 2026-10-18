import { describe, expect, test } from "bun:test";

import {
  createHeadingIdResolver,
  extractMarkdownHeadings,
  extractMarkdownHeadingsWithOffsets,
  normalizeMarkdownHeadingText,
  slugifyHeadingText,
} from "../../../../../front-end/src/shared/lib/markdown-headings";

describe("normalizeMarkdownHeadingText", () => {
  test("strips image and link markup, keeping their visible text", () => {
    expect(normalizeMarkdownHeadingText("![Alt label](/assets/logo.svg) plus text")).toBe("Alt label plus text");
    expect(normalizeMarkdownHeadingText("[Reference style][ref]")).toBe("Reference style");
  });

  test("strips inline code, emphasis, html tags, and unescapes symbols", () => {
    expect(normalizeMarkdownHeadingText("`code` inline")).toBe("code inline");
    expect(normalizeMarkdownHeadingText("Title <span>inline html</span>")).toBe("Title inline html");
    expect(normalizeMarkdownHeadingText("a \\[b\\]")).toBe("a [b]");
  });

  test("collapses whitespace and trims", () => {
    expect(normalizeMarkdownHeadingText("  spaced   out  ")).toBe("spaced out");
  });
});

describe("slugifyHeadingText", () => {
  test("lowercases, keeps unicode letters and digits, drops punctuation", () => {
    expect(slugifyHeadingText("Héllo Wörld 🚀")).toBe("héllo-wörld");
    expect(slugifyHeadingText("Don't stop")).toBe("dont-stop");
    expect(slugifyHeadingText("API 2.0")).toBe("api-2-0");
  });

  test("returns an empty string when nothing slugifyable remains", () => {
    expect(slugifyHeadingText("")).toBe("");
    expect(slugifyHeadingText("???")).toBe("");
  });
});

describe("createHeadingIdResolver", () => {
  test("disambiguates duplicates with count-based suffixes", () => {
    const resolve = createHeadingIdResolver();

    expect(resolve("Intro")).toBe("intro");
    expect(resolve("Intro")).toBe("intro-1");
    expect(resolve("Intro")).toBe("intro-2");
  });

  test("names un-slugifyable headings section, also count-based", () => {
    const resolve = createHeadingIdResolver();

    expect(resolve("⚡")).toBe("section");
    expect(resolve("⚡")).toBe("section-1");
  });
});

describe("extractMarkdownHeadings", () => {
  test("extracts atx headings with normalized text and unique ids", () => {
    const headings = extractMarkdownHeadings("# One\n## Two\n### Three\n# One", 3);

    expect(headings.map(({ id, text, depth }) => [id, text, depth])).toEqual([
      ["one", "One", 1],
      ["two", "Two", 2],
      ["three", "Three", 3],
      ["one-1", "One", 1],
    ]);
  });

  test("extracts setext headings with depth by underline", () => {
    const headings = extractMarkdownHeadings("Title\n===\n\nSubtitle\n---", 3);

    expect(headings.map(({ text, depth }) => [text, depth])).toEqual([
      ["Title", 1],
      ["Subtitle", 2],
    ]);
  });

  test("excludes headings inside fenced code blocks of either delimiter", () => {
    const markdown = "```md\n# Fenced backtick\n```\n\n~~~\n## Fenced tilde\n~~~\n\n# Real\n";
    const headings = extractMarkdownHeadings(markdown, 3);

    expect(headings.map(({ text }) => text)).toEqual(["Real"]);
  });

  test("reads --- under a list, quote, table or HTML line as a thematic break, not a heading", () => {
    const markdown = [
      "- one\n- two\n---",
      "> quoted\n---",
      "| a | b |\n|---|---|\n| 1 | 2 |\n---",
      "a | b\n--- | ---\n1 | 2\n---",
      "1. first\nlazy line\n---",
      "Para\n<div>\n---",
      "# Real",
    ].join("\n\n");

    expect(extractMarkdownHeadings(markdown, 3).map(({ text }) => text)).toEqual(["Real"]);
  });

  test("reads === under a list or quote line as lazy text, not a heading", () => {
    expect(extractMarkdownHeadings("- item\n===\n\n> quoted\n===", 3)).toEqual([]);
  });

  test("still reads a setext heading after a thematic break or indented code", () => {
    const headings = extractMarkdownHeadings("***\nAfter rule\n---\n\n    code\nAfter code\n===", 3);

    expect(headings.map(({ text, depth }) => [text, depth])).toEqual([
      ["After rule", 2],
      ["After code", 1],
    ]);
  });

  test("reads a setext heading over a paragraph that a list item or 1. does not interrupt", () => {
    const headings = extractMarkdownHeadings("Text\n2. not a list\n---\n\nIntro\n-\n", 3);

    expect(headings.map(({ text }) => text)).toEqual(["Text 2. not a list", "Intro"]);
  });

  test("takes every line of a multi-line setext heading", () => {
    const headings = extractMarkdownHeadingsWithOffsets("Para\n\nLine one\n  Line two\n===", 3);

    expect(headings.map(({ id, text, startOffset, startLine }) => [id, text, startOffset, startLine])).toEqual([
      ["line-one-line-two", "Line one Line two", 6, 3],
    ]);
  });

  test("does not close a fence on a fence line that carries an info string", () => {
    const markdown = "```md\n```bash\n# install\n```\n\n# After";

    expect(extractMarkdownHeadings(markdown, 3).map(({ text }) => text)).toEqual(["After"]);
  });

  test("extracts atx and setext headings indented by up to three spaces", () => {
    const headings = extractMarkdownHeadings(" # One\n  ## Two\n   ### Three\n\n  Four\n   ---", 3);

    expect(headings.map(({ text, depth }) => [text, depth])).toEqual([
      ["One", 1],
      ["Two", 2],
      ["Three", 3],
      ["Four", 2],
    ]);
  });

  test("treats lines indented by four or more spaces or a tab as code, not headings", () => {
    const headings = extractMarkdownHeadings("    # Code\n\n\t## Tab code\n\n    Code\n    ---\n\n# Real", 3);

    expect(headings.map(({ text }) => text)).toEqual(["Real"]);
  });

  test("respects maxDepth and skips empty headings", () => {
    const headings = extractMarkdownHeadings("# One\n### Three\n#### Four\n# \n", 3);

    expect(headings.map(({ text }) => text)).toEqual(["One", "Three"]);
  });

  test("normalizes inline markup in heading text", () => {
    const headings = extractMarkdownHeadings("# [Visit](/here) and `code`", 3);

    expect(headings[0]?.text).toBe("Visit and code");
    expect(headings[0]?.id).toBe("visit-and-code");
  });

  test("derives unicode ids end-to-end, disambiguating duplicates", () => {
    const headings = extractMarkdownHeadings("# Héllo Wörld\n# Héllo Wörld", 3);

    expect(headings.map(({ id, text }) => [id, text])).toEqual([
      ["héllo-wörld", "Héllo Wörld"],
      ["héllo-wörld-1", "Héllo Wörld"],
    ]);
  });
});

describe("extractMarkdownHeadingsWithOffsets", () => {
  test("reports zero-based start offsets and one-based line/column", () => {
    const markdown = "# Intro\n\n## [Reference style][ref]\n\nTitle\n===\n\nSub\n---\n\n```md\n# Not a heading\n```\n\n~~~\n## Also not\n~~~\n\n# Intro\n";
    const headings = extractMarkdownHeadingsWithOffsets(markdown, 3);

    expect(
      headings.map(({ id, startOffset, startLine, startColumn }) => [id, startOffset, startLine, startColumn]),
    ).toEqual([
      ["intro", 0, 1, 1],
      ["reference-style", 9, 3, 1],
      ["title", 36, 5, 1],
      ["sub", 47, 8, 1],
      ["intro-1", 104, 19, 1],
    ]);
  });

  test("reports the offset and column of the first non-space character for indented headings", () => {
    const headings = extractMarkdownHeadingsWithOffsets("   ## Setup\n## Setup\n\n  Title\n-----", 3);

    expect(
      headings.map(({ id, startOffset, startLine, startColumn }) => [id, startOffset, startLine, startColumn]),
    ).toEqual([
      ["setup", 3, 1, 4],
      ["setup-1", 12, 2, 1],
      ["title", 24, 4, 3],
    ]);
  });

  test("reports stable offsets across crlf line endings", () => {
    const headings = extractMarkdownHeadingsWithOffsets("# A\r\n# B\r\n# C", 3);

    expect(headings.map(({ id, startOffset, startLine }) => [id, startOffset, startLine])).toEqual([
      ["a", 0, 1],
      ["b", 5, 2],
      ["c", 10, 3],
    ]);
  });
});
