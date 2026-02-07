import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { tmpdir } from "os";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { getContentBySlug, listContent } from "./content";

const CONTENT_DIR = resolve(import.meta.dirname, "../../content");

describe("content service", () => {
  test("listContent returns items with frontmatter but no body", async () => {
    const items = await listContent(CONTENT_DIR);

    expect(items.length).toBeGreaterThan(0);

    const first = items[0];
    if (first === undefined) {
      throw new Error("Expected at least one content item");
    }
    expect(first.title).toBe("Hello World");
    expect(first.type).toBe("article");
    expect(first.tags).toContain("example");
    expect(first.slug).toBe("hello-world");
    // listContent should NOT include the body
    expect(first).not.toHaveProperty("body");
  });

  test("getContentBySlug returns frontmatter and body", async () => {
    const item = await getContentBySlug("hello-world", CONTENT_DIR);

    expect(item).not.toBeNull();
    if (item === null) {
      throw new Error("Expected hello-world content item");
    }
    expect(item.title).toBe("Hello World");
    expect(item.slug).toBe("hello-world");
    expect(item.body).toContain("# Hello World");
    expect(item.body).toContain("## Text Formatting");
  });

  test("getContentBySlug returns null for nonexistent slug", async () => {
    const item = await getContentBySlug("nonexistent", CONTENT_DIR);
    expect(item).toBeNull();
  });

  test("listContent filters by type when provided", async () => {
    const articles = await listContent(CONTENT_DIR, { type: "article" });
    expect(articles.length).toBeGreaterThan(0);
    for (const item of articles) {
      expect(item.type).toBe("article");
    }

    const projects = await listContent(CONTENT_DIR, { type: "project" });
    expect(projects.length).toBe(0); // no project files in test content
  });

  test("listContent returns all types when no filter", async () => {
    const all = await listContent(CONTENT_DIR);
    expect(all.length).toBeGreaterThan(0);
  });

  test("listContent treats publishDate-only frontmatter as an article", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "publish-date-only.md"),
        [
          "---",
          "title: Publish Date Only",
          "publishDate: 2025-07-02",
          "---",
          "",
          "# Publish Date Only",
        ].join("\n"),
      );

      const items = await listContent(tempContentDir, { type: "article" });
      expect(items).toHaveLength(1);

      const first = items[0];
      if (first === undefined) {
        throw new Error("Expected one content item");
      }
      expect(first.type).toBe("article");
      expect(first.date.startsWith("2025-07-02")).toBe(true);
      expect(first.tags).toEqual([]);
      expect(first.draft).toBe(false);
      expect(first.slug).toBe("publish-date-only");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("getContentBySlug normalizes publishDate-only frontmatter", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "publish-date-details.md"),
        [
          "---",
          "title: Publish Date Details",
          "publishDate: 2025-07-03",
          "---",
          "",
          "# Publish Date Details",
        ].join("\n"),
      );

      const item = await getContentBySlug("publish-date-details", tempContentDir);
      expect(item).not.toBeNull();
      if (item === null) {
        throw new Error("Expected publish-date-details content item");
      }

      expect(item.type).toBe("article");
      expect(item.date.startsWith("2025-07-03")).toBe(true);
      expect(item.tags).toEqual([]);
      expect(item.draft).toBe(false);
      expect(item.description).toBe("");
      expect(item.body).toContain("# Publish Date Details");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("getContentBySlug rewrites Obsidian image embeds to site image URLs", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "obsidian-image.md"),
        [
          "---",
          "title: Obsidian Image",
          "description: test file",
          "date: 2026-02-07T12:00:00Z",
          "tags:",
          "  - test",
          "type: article",
          "draft: false",
          "slug: obsidian-image",
          "---",
          "",
          "Before",
          "",
          "![[images/pixel.gif]]",
          "",
          "After",
        ].join("\n"),
      );

      const item = await getContentBySlug("obsidian-image", tempContentDir);
      expect(item).not.toBeNull();
      if (item === null) {
        throw new Error("Expected obsidian-image content item");
      }
      expect(item.body).toContain("![](/content-assets/images/pixel.gif)");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });
});
