import { describe, expect, test } from "bun:test";

import type { ParseResult } from "../../../../../back-end/src/features/content/frontmatter";
import { readFrontmatter } from "../../../../../back-end/src/features/content/frontmatter";

/** Parses `raw`, failing the test (rather than returning null) if it is rejected. */
function parsed(raw: string): ParseResult {
  const read = readFrontmatter(raw);

  if (!read.ok) {
    throw new Error(`expected frontmatter to parse, got: ${read.reason}`);
  }

  return read.result;
}

describe("readFrontmatter", () => {
  test("parses article frontmatter scalars and tags list", () => {
    const raw = `---
title: Introduction
slug: introduction
description: A quick overview.
type: article
category: Introduction
publishDate: 2026-02-08
tags:
  - Introduction
---
Body text here
`;

    const result = parsed(raw);

    expect(result.data["title"]).toBe("Introduction");
    expect(result.data["slug"]).toBe("introduction");
    expect(result.data["description"]).toBe("A quick overview.");
    expect(result.data["type"]).toBe("article");
    expect(result.data["category"]).toBe("Introduction");
    expect(result.data["publishDate"]).toBe("2026-02-08");
    expect(result.data["tags"]).toEqual(["Introduction"]);
    expect(result.content).toBe("Body text here\n");
  });

  test("parses multiple tag entries", () => {
    const raw = `---
title: My OS
type: article
category: Linux
publishDate: 2025-04-13
tags:
  - Bazzite
  - Bluefin
  - Docker
---
`;

    const result = parsed(raw);

    expect(result.data["tags"]).toEqual(["Bazzite", "Bluefin", "Docker"]);
  });

  test("parses project nested links list", () => {
    const raw = `---
title: Minimal Android Launcher
type: project
date: 2026-06-10
draft: false
featured: true
projectOrder: 10
status: In development
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/website
---
Body
`;

    const result = parsed(raw);

    expect(result.data["title"]).toBe("Minimal Android Launcher");
    expect(result.data["type"]).toBe("project");
    expect(result.data["draft"]).toBe(false);
    expect(result.data["featured"]).toBe(true);
    expect(result.data["projectOrder"]).toBe(10);

    expect(result.data["links"]).toEqual([
      {
        type: "repo",
        label: "Source repository",
        href: "https://github.com/Tim-van-Oudheusden/website",
      },
    ]);
  });

  test("keeps colons inside scalar values (URLs)", () => {
    const raw = `---
title: Some title
description: See https://example.com/path and note the colon
slug: colon-test
type: article
category: Linux
publishDate: 2025-01-01
tags:
  - One
---
Body
`;

    const result = parsed(raw);

    expect(result.data["description"]).toBe(
      "See https://example.com/path and note the colon",
    );
  });

  test("parses numeric created field as a number", () => {
    const raw = `---
title: P
type: project
date: 2026-01-01
created: 2026
---

Body`;

    const result = parsed(raw);

    expect(result.data["created"]).toBe(2026);
  });

  test("extracts body when frontmatter directly precedes body with no blank line", () => {
    const raw = `---
title: T
date: 2026-01-01
tags:
  - X
---
this is the body`;

    const result = parsed(raw);

    expect(result.data["title"]).toBe("T");
    expect(result.content).toBe("this is the body");
  });

  test("rejects input with no leading frontmatter block", () => {
    const raw = `# Just a heading
No frontmatter here.
`;

    const read = readFrontmatter(raw);

    expect(read.ok).toBe(false);
    expect(!read.ok && read.reason).toBe("Frontmatter is missing its opening --- fence");
  });

  test("rejects an empty frontmatter block", () => {
    const raw = `---
---

Body
`;

    const read = readFrontmatter(raw);

    expect(read.ok).toBe(false);
    expect(!read.ok && read.reason).toBe("Frontmatter block has no fields");
  });

  test.each([
    [
      "rejects a block that is never closed",
      ["---", "title: Unclosed", "date: 2026-01-01", "", "Body that was meant to follow the block"],
      null,
    ],
    [
      "skips a blank line inside the block",
      ["---", "title: T", "", "date: 2026-01-01", "---", "Body"],
      { data: { title: "T", date: "2026-01-01" }, content: "Body" },
    ],
    [
      "skips a non-field line inside the block",
      ["---", "title: T", "# a note left in the frontmatter", "date: 2026-01-01", "---", "Body"],
      { data: { title: "T", date: "2026-01-01" }, content: "Body" },
    ],
    [
      "skips a non-list line among a block key's children",
      ["---", "title: T", "tags:", "  - Linux", "  # - Retired tag", "  - Containers", "---", "Body"],
      { data: { title: "T", tags: ["Linux", "Containers"] }, content: "Body" },
    ],
    [
      "keeps list items after a blank line inside a block key's children",
      ["---", "title: T", "tags:", "  - Linux", "", "  - Containers", "---", "Body"],
      { data: { title: "T", tags: ["Linux", "Containers"] }, content: "Body" },
    ],
    [
      "keeps an object item's fields after a blank line instead of hoisting them",
      ["---", "title: T", "links:", "  - type: repo", "", "    url: https://x", "---", "Body"],
      { data: { title: "T", links: [{ type: "repo", url: "https://x" }] }, content: "Body" },
    ],
    [
      "does not let a nested field after a blank line overwrite a top-level key",
      ["---", "title: Real", "links:", "  - type: repo", "", "    title: Hijack", "---", "Body"],
      { data: { title: "Real", links: [{ type: "repo", title: "Hijack" }] }, content: "Body" },
    ],
    [
      "ends a block at a top-level key that follows a blank line",
      ["---", "tags:", "  - Linux", "", "title: T", "---", "Body"],
      { data: { tags: ["Linux"], title: "T" }, content: "Body" },
    ],
    [
      "ignores whitespace-only lines trailing a block",
      ["---", "title: T", "links:", "  - type: repo", "    url: https://x", "  ", "", "---", "Body"],
      { data: { title: "T", links: [{ type: "repo", url: "https://x" }] }, content: "Body" },
    ],
    [
      "reads a list written at the same indent as its key",
      ["---", "title: T", "tags:", "- Linux", "- Containers", "slug: t", "---", "Body"],
      { data: { title: "T", tags: ["Linux", "Containers"], slug: "t" }, content: "Body" },
    ],
    [
      "reads an object list written at the same indent as its key",
      ["---", "links:", "- type: repo", "  label: Repo", "- type: docs", "  label: Docs", "title: T", "---", "Body"],
      { data: { links: [{ type: "repo", label: "Repo" }, { type: "docs", label: "Docs" }], title: "T" }, content: "Body" },
    ],
    [
      "keeps an unindented list across a blank line and ends it at the next key",
      ["---", "tags:", "- Linux", "", "- Containers", "links:", "  - type: repo", "---", "Body"],
      { data: { tags: ["Linux", "Containers"], links: [{ type: "repo" }] }, content: "Body" },
    ],
    [
      "drops a trailing # comment from an unquoted value",
      ["---", "title: T", "draft: true # not ready yet", "---", "Body"],
      { data: { title: "T", draft: true }, content: "Body" },
    ],
    [
      "unwraps a double-quoted value",
      ["---", 'title: "Flatpak: a field guide"', 'date: "2026-10-02"', "---", "Body"],
      { data: { title: "Flatpak: a field guide", date: "2026-10-02" }, content: "Body" },
    ],
    [
      "unwraps a single-quoted value and keeps it a string",
      ["---", "title: 'It''s a #1 pick' # editor's note", "draft: 'true'", "---", "Body"],
      { data: { title: "It's a #1 pick", draft: "true" }, content: "Body" },
    ],
    [
      "decodes escaped quotes and backslashes inside double quotes",
      ["---", String.raw`title: "Say \"hi\" to C:\\ # loudly" # note`, "---", "Body"],
      { data: { title: String.raw`Say "hi" to C:\ # loudly` }, content: "Body" },
    ],
    [
      "reads a block key's children when the key carries only a comment",
      ["---", "title: T", "tags: # one per line", "  - Linux", "---", "Body"],
      { data: { title: "T", tags: ["Linux"] }, content: "Body" },
    ],
    [
      "unwraps quotes and drops comments in list items and object fields",
      [
        "---",
        "tags:",
        '  - "Linux: tips"',
        "  - Containers # main topic",
        "links:",
        "  - type: repo # source",
        "    label: 'Repo: main'",
        "---",
        "Body",
      ],
      { data: { tags: ["Linux: tips", "Containers"], links: [{ type: "repo", label: "Repo: main" }] }, content: "Body" },
    ],
    [
      "keeps tags after a column-0 comment line in an indented list",
      ["---", "tags:", "  - Linux", "# - Windows", "  - macOS", "title: T", "---", "Body"],
      { data: { tags: ["Linux", "macOS"], title: "T" }, content: "Body" },
    ],
    [
      "keeps tags after a column-0 comment line in an unindented list",
      ["---", "tags:", "- Linux", "# - Windows", "- macOS", "title: T", "---", "Body"],
      { data: { tags: ["Linux", "macOS"], title: "T" }, content: "Body" },
    ],
    [
      "keeps link objects after a column-0 comment line instead of hoisting their fields",
      [
        "---",
        "type: project",
        "links:",
        "  - type: repo",
        "    href: https://a",
        "# - type: demo",
        "  - label: Site",
        "    type: docs",
        "    href: https://b",
        "---",
        "Body",
      ],
      {
        data: { type: "project", links: [{ type: "repo", href: "https://a" }, { label: "Site", type: "docs", href: "https://b" }] },
        content: "Body",
      },
    ],
    [
      "keeps unindented link objects after a column-0 comment line",
      ["---", "links:", "- type: repo", "  href: https://a", "# - type: demo", "- type: docs", "  label: Site", "---", "Body"],
      { data: { links: [{ type: "repo", href: "https://a" }, { type: "docs", label: "Site" }] }, content: "Body" },
    ],
    [
      "keeps a link object's fields after a comment line between them",
      ["---", "links:", "  - type: repo", "# label: Old", "    # href: https://old", "    href: https://a", "title: T", "---", "Body"],
      { data: { links: [{ type: "repo", href: "https://a" }], title: "T" }, content: "Body" },
    ],
    [
      "keeps a list item with a colon but no following space a string",
      ["---", "tags:", "  - Re:Zero", "  - https://example.com", "  - Anime", "---", "Body"],
      { data: { tags: ["Re:Zero", "https://example.com", "Anime"] }, content: "Body" },
    ],
    [
      "reads True, TRUE, False and FALSE as booleans, as YAML does (#1036)",
      ["---", "draft: True", "featured: TRUE", "homeRecommended: False", "pinned: FALSE", "---", "Body"],
      { data: { draft: true, featured: true, homeRecommended: false, pinned: false }, content: "Body" },
    ],
    [
      "reads signed, decimal and exponent numbers as numbers, as YAML does (#1036)",
      ["---", "a: 1.5", "b: +5", "c: -2.25", "d: 1e3", "e: 5.", "f: .5", "g: 017", "---", "Body"],
      { data: { a: 1.5, b: 5, c: -2.25, d: 1000, e: 5, f: 0.5, g: 17 }, content: "Body" },
    ],
    [
      "keeps values YAML reads as text a string",
      ["---", "a: tRue", "b: yes", "c: 1.5.2", "d: 1_000", "e: 0X1F", "f: 2Easy", "---", "Body"],
      { data: { a: "tRue", b: "yes", c: "1.5.2", d: "1_000", e: "0X1F", f: "2Easy" }, content: "Body" },
    ],
    [
      "decodes every YAML escape inside double quotes (#1036)",
      [
        "---",
        String.raw`a: "x\ny\tz\0\a\b\v\f\r\e\ \/\N\_\L\P"`,
        String.raw`b: "\x41\u00e9\U0001F600"`,
        "c: \"tab\\\tchar\"",
        "---",
        "Body",
      ],
      {
        data: { a: "x\ny\tz\0\x07\b\v\f\r\x1b /\u0085\u00a0\u2028\u2029", b: "A\u00e9\u{1F600}", c: "tab\tchar" },
        content: "Body",
      },
    ],
  ])("%s", (_label, lines, expected) => {
    const read = readFrontmatter(lines.join("\n"));

    if (expected === null) {
      expect(read.ok).toBe(false);

      return;
    }

    expect(read.ok).toBe(true);
    expect(read.ok ? read.result : null).toEqual(expected);
  });

  test.each([
    [
      "a top-level line that is not a field",
      ["---", "title: T", "just a stray note", "date: 2026-01-01", "---", "Body"],
      "Frontmatter has a line that is not a `key: value` field: just a stray note",
    ],
    [
      "key:value without a space",
      ["---", "title: T", "draft:true", "---", "Body"],
      "Frontmatter has a line that is not a `key: value` field: draft:true",
    ],
    [
      "a value wrapped onto an indented line",
      ["---", "title: T", "description: A long summary that", "  wraps onto the next line", "---", "Body"],
      "description has a line indented under its value: wraps onto the next line",
    ],
    [
      "a field indented under a key that has a value",
      ["---", "title: Real", "description: Notes", "  draft: true", "---", "Body"],
      "description has a line indented under its value: draft: true",
    ],
    [
      "a field indented under a key that has a value, after a blank line",
      ["---", "title: Real", "description: Notes", "", "  title: Hijack", "---", "Body"],
      "description has a line indented under its value: title: Hijack",
    ],
    [
      "a line indented with a tab (#1035)",
      ["---", "description: Notes on X", "\tNote: this covers the 2025 rewrite", "---", "Body"],
      "Frontmatter has a line indented with a tab: Note: this covers the 2025 rewrite",
    ],
    [
      "a top-level key left of the first key",
      ["---", "  title: T", "draft: true", "---", "Body"],
      "Frontmatter has a line indented less than its first key: draft: true",
    ],
    [
      "a list item deeper than the first, which YAML reads as part of it",
      ["---", "tags:", "  - Linux", "    - Containers", "---", "Body"],
      "tags has a `- item` indented differently from its first item: - Containers",
    ],
    [
      "an object item's field out of line with its first field",
      ["---", "links:", "  - type: repo", "      href: https://x", "---", "Body"],
      "links has a field out of line with its item's first field: href: https://x",
    ],
  ])("rejects %s instead of dropping or hoisting it", (_label, lines, reason) => {
    expect(readFrontmatter(lines.join("\n"))).toEqual({ ok: false, reason });
  });

  test.each([
    [
      String.raw`a double-quoted \q`,
      ["---", String.raw`v: "a\qb"`, "---", "Body"],
      String.raw`v has a double-quoted escape YAML does not accept: \q`,
    ],
    [
      "a double-quoted lone surrogate",
      ["---", "tags:", String.raw`  - "\uD83D"`, "---", "Body"],
      String.raw`tags has a double-quoted escape YAML does not accept: \uD83D`,
    ],
    [
      "a double-quoted code point past U+10FFFF",
      ["---", "links:", "  - type: repo", String.raw`    label: "\U00110000"`, "---", "Body"],
      String.raw`links has a double-quoted escape YAML does not accept: \U00110000`,
    ],
  ])("rejects %s, as YAML does (#1036)", (_label, lines, reason) => {
    expect(readFrontmatter(lines.join("\n"))).toEqual({ ok: false, reason });
  });

  // The spec reads -.5 as a number and keeps -0x1F as text; Bun's reader does
  // the opposite, so either reading would differ from some YAML tool.
  test.each([
    ["a signed leading-dot number", ["---", "v: -.5 # half", "---", "Body"], "v has a number the subset does not read: -.5"],
    ["a signed hex number", ["---", "tags:", "  - -0x1F", "---", "Body"], "tags has a number the subset does not read: -0x1F"],
    ["a signed octal number", ["---", "v: +0o17", "---", "Body"], "v has a number the subset does not read: +0o17"],
  ])("rejects %s, which YAML readers disagree on (#1036)", (_label, lines, reason) => {
    expect(readFrontmatter(lines.join("\n"))).toEqual({ ok: false, reason });
  });

  // Each value as a top-level field, a `- ` item and an object item's field
  // (the three places a scalar is read) must read as YAML reads it (#1036).
  // `Bun.YAML` ships with the pinned Bun, so it is the reference.
  describe("types a scalar as YAML does", () => {
    const values = [
      "true", "True", "TRUE", "tRue", "false", "False", "FALSE", "yes",
      "null", "Null", "NULL", "~", "nUll",
      "0", "-5", "+5", "05", "-0", "1.5", "+1.5", ".5", "5.", "1e3", "1.5E-3", "0o17", "0x1F",
      ".inf", "-.Inf", "+.INF", ".nan", ".NaN", "1_000", "1,000", "2026-01-01", "+",
      String.raw`"x\ny"`, String.raw`"\t\"\\\/\ \0\a\b\v\f\r\e\N\_\L\P"`,
      String.raw`"\x41\u00e9\U0001F600"`, "\"tab\\\tescaped\"", "\"true\"", "'True'", "'it''s'",
      "True # draft until reviewed",
    ];

    test.each(values)("%s", (value) => {
      const raw = `title: ${value}\ntags:\n  - ${value}\nlinks:\n  - type: ${value}\n    label: ${value}\n`;
      const read = readFrontmatter(`---\n${raw}---\nBody`);

      const actual: unknown = read.ok ? read.result.data : read.reason;

      expect(actual).toEqual(Bun.YAML.parse(raw));
    });

    test("reads draft: True as a draft, not as the text True", () => {
      expect(parsed("---\ntitle: T\ndraft: True\n---\nBody").data["draft"]).toBe(true);
    });
  });

  describe("line endings and byte-order mark", () => {
    const lines = [
      "---",
      "title: Hello",
      "date: 2026-01-01",
      "draft: false",
      "tags:",
      "  - A",
      "  - B",
      "links:",
      "  - type: repo",
      "    href: https://example.com",
      "---",
      "Body line one",
      "Body line two",
      "",
    ];
    const data = {
      title: "Hello",
      date: "2026-01-01",
      draft: false,
      tags: ["A", "B"],
      links: [{ type: "repo", href: "https://example.com" }],
    };

    test("parses every field from a file with CRLF line endings", () => {
      const result = parsed(lines.join("\r\n"));

      expect(result.data).toEqual(data);
      expect(result.content).toBe("Body line one\r\nBody line two\r\n");
    });

    test("parses a file that starts with a UTF-8 byte-order mark", () => {
      const result = parsed(`\uFEFF${lines.join("\n")}`);

      expect(result.data).toEqual(data);
      expect(result.content).toBe("Body line one\nBody line two\n");
    });

    test("parses a CRLF file that starts with a byte-order mark", () => {
      expect(parsed(`\uFEFF${lines.join("\r\n")}`).data).toEqual(data);
    });
  });
});
