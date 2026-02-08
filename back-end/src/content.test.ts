import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { tmpdir } from "os";
import { mkdtemp, rm, writeFile } from "fs/promises";
import type { ArticleCategory } from "shared";
import { getContentBySlug, listContent } from "./content";

function articleMarkdown(
  overrides: Partial<{
    title: string;
    description: string;
    date: string;
    slug: string;
    tags: string[];
    body: string;
    type: "article" | "project";
    draft: boolean;
    category: ArticleCategory;
  }> = {},
): string {
  const title = overrides.title ?? "Sample Article";
  const description = overrides.description ?? "Sample description";
  const date = overrides.date ?? "2026-02-07T12:00:00Z";
  const slug = overrides.slug ?? "sample-article";
  const tags = overrides.tags ?? ["sample"];
  const body = overrides.body ?? "# Sample Article\n\nBody text";
  const type = overrides.type ?? "article";
  const draft = overrides.draft ?? false;
  const category = overrides.category;

  return [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    `date: ${date}`,
    "tags:",
    ...tags.map((tag) => `  - ${tag}`),
    `type: ${type}`,
    `draft: ${draft}`,
    ...(category === undefined ? [] : [`category: ${category}`]),
    `slug: ${slug}`,
    "---",
    "",
    body,
  ].join("\n");
}

describe("content service", () => {
  test("listContent returns items with frontmatter but no body", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "sample-article.md"),
        articleMarkdown(),
      );

      const items = await listContent(tempContentDir);
      expect(items).toHaveLength(1);

      const first = items[0];
      if (first === undefined) {
        throw new Error("Expected one content item");
      }
      expect(first.title).toBe("Sample Article");
      expect(first.type).toBe("article");
      expect(first.tags).toContain("sample");
      expect(first.slug).toBe("sample-article");
      expect(first).not.toHaveProperty("body");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("getContentBySlug returns frontmatter and body", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "sample-article.md"),
        articleMarkdown({ body: "# Sample Article\n\n## Details\n\nMore text" }),
      );

      const item = await getContentBySlug("sample-article", tempContentDir);
      expect(item).not.toBeNull();
      if (item === null) {
        throw new Error("Expected sample-article content item");
      }
      expect(item.title).toBe("Sample Article");
      expect(item.slug).toBe("sample-article");
      expect(item.body).toContain("# Sample Article");
      expect(item.body).toContain("## Details");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("getContentBySlug returns null for nonexistent slug", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(resolve(tempContentDir, "sample-article.md"), articleMarkdown());

      const item = await getContentBySlug("nonexistent", tempContentDir);
      expect(item).toBeNull();
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("listContent filters by type when provided", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "sample-article.md"),
        articleMarkdown({ slug: "sample-article", type: "article" }),
      );
      await writeFile(
        resolve(tempContentDir, "sample-project.md"),
        articleMarkdown({
          title: "Sample Project",
          slug: "sample-project",
          type: "project",
        }),
      );

      const articles = await listContent(tempContentDir, { type: "article" });
      expect(articles).toHaveLength(1);
      expect(articles[0]).toHaveProperty("type", "article");
      expect(articles[0]).toHaveProperty("slug", "sample-article");

      const projects = await listContent(tempContentDir, { type: "project" });
      expect(projects).toHaveLength(1);
      expect(projects[0]).toHaveProperty("type", "project");
      expect(projects[0]).toHaveProperty("slug", "sample-project");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("listContent returns all types when no filter", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(resolve(tempContentDir, "sample-article.md"), articleMarkdown());
      await writeFile(
        resolve(tempContentDir, "sample-project.md"),
        articleMarkdown({ slug: "sample-project", type: "project" }),
      );

      const all = await listContent(tempContentDir);
      expect(all).toHaveLength(2);
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
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

  test("listContent preserves supported article category values from frontmatter", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "linux-article.md"),
        [
          "---",
          "title: Linux Article",
          "description: Category parsing test",
          "publishDate: 2025-07-04",
          "category: Linux",
          "---",
          "",
          "# Linux Article",
        ].join("\n"),
      );

      const items = await listContent(tempContentDir, { type: "article" });
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveProperty("category", "Linux");
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
