import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
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

    const result = parseFrontmatter(raw);

    expect(result).not.toBeNull();
    expect(result!.data["title"]).toBe("Introduction");
    expect(result!.data["slug"]).toBe("introduction");
    expect(result!.data["description"]).toBe("A quick overview.");
    expect(result!.data["type"]).toBe("article");
    expect(result!.data["category"]).toBe("Introduction");
    expect(result!.data["publishDate"]).toBe("2026-02-08");
    expect(result!.data["tags"]).toEqual(["Introduction"]);
    expect(result!.content).toBe("Body text here\n");
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

    const result = parseFrontmatter(raw);
    expect(result!.data["tags"]).toEqual(["Bazzite", "Bluefin", "Docker"]);
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

    const result = parseFrontmatter(raw);
    expect(result!.data["title"]).toBe("Minimal Android Launcher");
    expect(result!.data["type"]).toBe("project");
    expect(result!.data["draft"]).toBe(false);
    expect(result!.data["featured"]).toBe(true);
    expect(result!.data["projectOrder"]).toBe(10);
    expect(result!.data["links"]).toEqual([
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

    const result = parseFrontmatter(raw);
    expect(result!.data["description"]).toBe(
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

    const result = parseFrontmatter(raw);
    expect(result!.data["created"]).toBe(2026);
  });

  test("extracts body when frontmatter directly precedes body with no blank line", () => {
    const raw = `---
title: T
date: 2026-01-01
tags:
  - X
---
this is the body`;

    const result = parseFrontmatter(raw);
    expect(result!.data["title"]).toBe("T");
    expect(result!.content).toBe("this is the body");
  });

  test("returns null when no leading frontmatter block exists", () => {
    const raw = `# Just a heading
No frontmatter here.
`;
    expect(parseFrontmatter(raw)).toBeNull();
  });

  test("returns null for an empty frontmatter block", () => {
    const raw = `---
---

Body
`;
    expect(parseFrontmatter(raw)).toBeNull();
  });
});