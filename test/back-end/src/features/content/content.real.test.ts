import { describe, expect, test } from "bun:test";
import { resolve } from "path";
import { listContent, getContentBySlug } from "../../../../../back-end/src/features/content/content";

// Resolve the repo-root content dir from the module location, not CWD, so the
// test works both standalone and via `bun run test` (workspace filter).
const CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

describe("content pipeline with custom frontmatter parser", () => {
  test("parses all real markdown files as list items", async () => {
    const items = await listContent(CONTENT_DIR);
    expect(items.length).toBeGreaterThanOrEqual(8);
    const titles = items.map((i) => i.title);
    expect(titles).toContain("Introduction");
    expect(titles).toContain("Minimal Android Launcher");
  });

  test("resolves an article by slug with body intact", async () => {
    const item = await getContentBySlug("introduction", CONTENT_DIR);
    expect(item).not.toBeNull();
    expect(item!.title).toBe("Introduction");
    expect(item!.body).toContain("# Welcome");
  });

  test("resolves a project with nested links by slug", async () => {
    const item = await getContentBySlug("minimal-android-launcher", CONTENT_DIR);
    expect(item).not.toBeNull();
    expect(item!.type).toBe("project");
    expect(item!.links).toEqual([
      {
        type: "repo",
        label: "Source repository",
        href: "https://github.com/Tim-van-Oudheusden/website",
      },
    ]);
    expect(item!.projectOrder).toBe(10);
  });
});