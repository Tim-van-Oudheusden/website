import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { ArticleFrontmatter, ProjectFrontmatter } from "shared";

import { getContentBySlug, listContent, validateContentDir } from "../../../../../back-end/src/features/content/content";

// Resolve the repo-root content dir from the module location, not CWD, so the
// test works both standalone and via `bun run test` (workspace filter).
const REAL_CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

const VALID_PROJECT = [
  "---",
  "title: Launcher",
  "date: 2026-06-10",
  "tags:",
  "  - Android",
  "type: project",
  "draft: false",
  "slug: launcher",
  "coverImage: /images/projects/phone.png",
  "coverImageAlt: Phone mockup",
  "featured: true",
  "projectOrder: 10",
  "status: In Progress",
  "role: Full-stack developer",
  "links:",
  "  - type: repo",
  "    label: Source repository",
  "    href: https://github.com/example/repo",
  "  - type: bogus",
  "    label: Dropped link",
  "    href: https://example.com/dropped",
  "---",
  "# Launcher",
].join("\n");

const FIXTURES = {
  "intro.md": [
    "---",
    "title: Introduction",
    "publishDate: 2026-06-10",
    "type: article",
    "category: Introduction",
    "---",
    "# Welcome",
  ].join("\n"),
  "unknown-type.md": [
    "---",
    "title: Video Post",
    "date: 2026-05-01",
    "type: video",
    "category: Linux",
    "---",
    "# Video",
  ].join("\n"),
  "draft.md": [
    "---",
    "title: Draft Post",
    "date: 2026-04-01",
    "type: article",
    "category: Work",
    "draft: true",
    "---",
    "# Draft",
  ].join("\n"),
  "launcher.md": VALID_PROJECT,
  "bad-status.md": [
    "---",
    "title: Broken Status",
    "date: 2026-03-01",
    "type: project",
    "coverImage: /images/projects/x.png",
    "coverImageAlt: X",
    "status: In development",
    "---",
    "# Broken Status",
  ].join("\n"),
  "bad-links.md": [
    "---",
    "title: Broken Links",
    "date: 2026-02-01",
    "type: project",
    "coverImage: /images/projects/y.png",
    "coverImageAlt: Y",
    "role:   ",
    "links:",
    "  - type: repo",
    "    label: Kept",
    "    href: https://github.com/example/kept",
    "  - type: repo",
    "    label: No href",
    "  - nope",
    "---",
    "# Broken Links",
  ].join("\n"),
  "no-title.md": [
    "---",
    "date: 2026-01-01",
    "type: article",
    "category: Work",
    "---",
    "# No Title",
  ].join("\n"),
  "no-frontmatter.md": "# Plain markdown body",
} as const;

/** Fixtures that make listContent skip the document; kept out of the main fixture dir. */
const INVALID_FIXTURES = {
  "no-category.md": [
    "---",
    "title: No Category",
    "date: 2026-01-01",
    "type: article",
    "---",
    "# No Category",
  ].join("\n"),
  "no-cover.md": [
    "---",
    "title: No Cover",
    "date: 2026-01-01",
    "type: project",
    "---",
    "# No Cover",
  ].join("\n"),
} as const;

describe("content normalization against controlled fixtures", () => {
  let contentDir: string;
  let invalidCategoryDir: string;
  let invalidCoverDir: string;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-content-normalize-"));
    invalidCategoryDir = await mkdtemp(join(tmpdir(), "website-content-category-"));
    invalidCoverDir = await mkdtemp(join(tmpdir(), "website-content-cover-"));

    for (const [fileName, content] of Object.entries(FIXTURES)) {
      await writeFile(join(contentDir, fileName), content);
    }

    await writeFile(join(invalidCategoryDir, "no-category.md"), INVALID_FIXTURES["no-category.md"]);
    await writeFile(join(invalidCoverDir, "no-cover.md"), INVALID_FIXTURES["no-cover.md"]);
  });

  afterAll(async () => {
    await rm(contentDir, { recursive: true, force: true });
    await rm(invalidCategoryDir, { recursive: true, force: true });
    await rm(invalidCoverDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  function setProduction(): void {
    process.env.NODE_ENV = "production";
  }

  test("falls back from date to publishDate", async () => {
    const items = await listContent(contentDir, { type: null });
    const intro = items.find((item) => item.title === "Introduction");

    expect(intro?.date).toBe("2026-06-10");
  });

  test("defaults unknown types to article", async () => {
    const items = await listContent(contentDir, { type: null });
    const video = items.find((item) => item.slug === "unknown-type");

    expect(video?.type).toBe("article");
    expect((video as ArticleFrontmatter | undefined)?.category).toBe("Linux");
  });

  test("narrows the listing with the type filter", async () => {
    const articles = await listContent(contentDir, { type: "article" });
    const projects = await listContent(contentDir, { type: "project" });

    expect(articles.map((item) => item.type)).toEqual(Array(articles.length).fill("article"));
    expect(projects.map((item) => item.type)).toEqual(Array(projects.length).fill("project"));
    expect(articles.some((item) => item.slug === "intro")).toBe(true);
    expect(articles.some((item) => item.slug === "launcher")).toBe(false);
    expect(projects.some((item) => item.slug === "launcher")).toBe(true);
    expect(projects.some((item) => item.slug === "intro")).toBe(false);
  });

  test("skips drafts only in production", async () => {
    delete process.env.NODE_ENV;
    const draftsInDev = await listContent(contentDir, { type: null });

    expect(draftsInDev.some((item) => item.slug === "draft")).toBe(true);

    setProduction();
    const draftsInProd = await listContent(contentDir, { type: null });

    expect(draftsInProd.some((item) => item.slug === "draft")).toBe(false);
  });

  test("hides a draft by slug in production", async () => {
    setProduction();
    expect(await getContentBySlug("draft", contentDir)).toBeNull();

    const intro = await getContentBySlug("intro", contentDir);

    expect(intro?.title).toBe("Introduction");
  });

  test("skips documents without a frontmatter block or title", async () => {
    const items = await listContent(contentDir, { type: null });

    expect(items.some((item) => item.slug === "no-frontmatter")).toBe(false);
    expect(items.some((item) => item.slug === "no-title")).toBe(false);
  });

  test("skips documents with an invalid status and drops blank roles", async () => {
    const items = await listContent(contentDir, { type: null });

    expect(items.some((item) => item.slug === "bad-status")).toBe(false);
    const badLinks = items.find((item) => item.slug === "bad-links");

    expect((badLinks as ProjectFrontmatter | undefined)?.role).toBeNull();
  });

  test("reports invalid, untitled, and unparseable documents via the directory audit", async () => {
    const errors = await validateContentDir(contentDir);

    expect(errors.map((error) => [error.file, error.field]).sort()).toEqual([
      ["bad-status.md", "status"],
      ["no-frontmatter.md", null],
      ["no-title.md", "title"],
    ]);
  });

  test("keeps valid links and drops invalid link entries", async () => {
    const items = await listContent(contentDir, { type: null });
    const healthy = items.find((item) => item.slug === "launcher");
    const broken = items.find((item) => item.slug === "bad-links");

    expect((healthy as ProjectFrontmatter | undefined)?.links).toEqual([
      { type: "repo", label: "Source repository", href: "https://github.com/example/repo" },
    ]);

    expect((broken as ProjectFrontmatter | undefined)?.links).toEqual([
      { type: "repo", label: "Kept", href: "https://github.com/example/kept" },
    ]);
  });

  test("resolves valid project fields through normalization", async () => {
    const item = await getContentBySlug("launcher", contentDir);

    expect(item).not.toBeNull();
    const project = item as ProjectFrontmatter & { body: string };

    expect(project.type).toBe("project");
    expect(project.status).toBe("In Progress");
    expect(project.role).toBe("Full-stack developer");
    expect(project.featured).toBe(true);
    expect(project.projectOrder).toBe(10);
    expect(project.body).toContain("# Launcher");
  });

  test("skips an article without a valid category and audits it", async () => {
    expect(await listContent(invalidCategoryDir, { type: null })).toEqual([]);

    expect(await validateContentDir(invalidCategoryDir)).toMatchObject([
      { file: "no-category.md", field: "category" },
    ]);
  });

  test("skips a project missing coverImage and coverImageAlt and audits it", async () => {
    expect(await listContent(invalidCoverDir, { type: null })).toEqual([]);

    expect(await validateContentDir(invalidCoverDir)).toMatchObject([
      { file: "no-cover.md", field: "coverImage" },
    ]);
  });
});

describe("real content directory sanity check", () => {
  test("parses all real markdown files as list items", async () => {
    const items = await listContent(REAL_CONTENT_DIR, { type: null });

    expect(items.length).toBeGreaterThanOrEqual(8);
    const titles = items.map((i) => i.title);

    expect(titles).toContain("Introduction");
    expect(titles).toContain("Minimal Android Launcher");
  });

  test("resolves an article by slug with body intact", async () => {
    const item = await getContentBySlug("introduction", REAL_CONTENT_DIR);

    expect(item).not.toBeNull();
    expect(item!.title).toBe("Introduction");
    expect(item!.body).toContain("# Welcome");
  });

  test("the home-recommended article pool matches the curated real content", async () => {
    const articles = await listContent(REAL_CONTENT_DIR, { type: "article" });
    const recommendedSlugs = articles
      .filter((item): item is ArticleFrontmatter => item.type === "article" && item.homeRecommended === true)
      .map((item) => item.slug)
      .sort();

    expect(recommendedSlugs).toEqual([
      "introduction",
      "making-my-work-easier-with-notes-in-obsidian",
      "my-operating-system-is-a-container-image-yes-really",
      "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    ]);
  });

  test("resolves a project with nested links by slug", async () => {
    const item = await getContentBySlug("minimal-android-launcher", REAL_CONTENT_DIR);

    expect(item).not.toBeNull();
    const project = item as ProjectFrontmatter & { body: string };

    expect(project.type).toBe("project");

    expect(project.links).toEqual([
      {
        type: "repo",
        label: "Source repository",
        href: "https://github.com/Tim-van-Oudheusden/website",
      },
    ]);

    expect(project.projectOrder).toBe(10);
  });
});
