import { describe, expect, test } from "bun:test";
import type { ContentFrontmatter, ContentType } from "./index";
import { CONTENT_TYPES } from "./index";

describe("content frontmatter schema", () => {
  test("CONTENT_TYPES contains article and project", () => {
    expect(CONTENT_TYPES).toContain("article");
    expect(CONTENT_TYPES).toContain("project");
  });

  test("CONTENT_TYPES has exactly two entries", () => {
    expect(CONTENT_TYPES).toHaveLength(2);
  });

  test("a valid ContentFrontmatter object has all required fields", () => {
    const frontmatter: ContentFrontmatter = {
      title: "Test Article",
      description: "A test article",
      date: "2026-01-15T00:00:00Z",
      tags: ["test", "example"],
      type: "article",
      draft: false,
    };

    expect(frontmatter.title).toBe("Test Article");
    expect(frontmatter.description).toBe("A test article");
    expect(frontmatter.date).toBe("2026-01-15T00:00:00Z");
    expect(frontmatter.tags).toEqual(["test", "example"]);
    expect(frontmatter.type).toBe("article");
    expect(frontmatter.draft).toBe(false);
    expect(frontmatter.slug).toBeUndefined();
  });

  test("slug is optional and can be set", () => {
    const frontmatter: ContentFrontmatter = {
      title: "With Slug",
      description: "Has a slug",
      date: "2026-01-15T00:00:00Z",
      tags: [],
      type: "project",
      draft: true,
      slug: "custom-slug",
    };

    expect(frontmatter.slug).toBe("custom-slug");
  });

  test("ContentType values are assignable from CONTENT_TYPES", () => {
    for (const ct of CONTENT_TYPES) {
      const typed: ContentType = ct;
      expect(typeof typed).toBe("string");
    }
  });
});
