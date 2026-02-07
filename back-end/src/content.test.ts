import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { getContentBySlug, listContent } from "./content";

const CONTENT_DIR = resolve(import.meta.dirname, "../../content");

describe("content service", () => {
  test("listContent returns items with frontmatter but no body", async () => {
    const items = await listContent(CONTENT_DIR);

    expect(items.length).toBeGreaterThan(0);

    const first = items[0]!;
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
    expect(item!.title).toBe("Hello World");
    expect(item!.slug).toBe("hello-world");
    expect(item!.body).toContain("# Hello World");
    expect(item!.body).toContain("## Text Formatting");
  });

  test("getContentBySlug returns null for nonexistent slug", async () => {
    const item = await getContentBySlug("nonexistent", CONTENT_DIR);
    expect(item).toBeNull();
  });
});
