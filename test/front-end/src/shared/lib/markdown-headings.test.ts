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

  test("reports stable offsets across crlf line endings", () => {
    const headings = extractMarkdownHeadingsWithOffsets("# A\r\n# B\r\n# C", 3);

    expect(headings.map(({ id, startOffset, startLine }) => [id, startOffset, startLine])).toEqual([
      ["a", 0, 1],
      ["b", 5, 2],
      ["c", 10, 3],
    ]);
  });
});
