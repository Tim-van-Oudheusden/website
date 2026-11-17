import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { STANDALONE_PAGE_SLUGS } from "shared";

import { getPageBySlug, PAGES_DIR } from "../../../../../back-end/src/features/pages/pages";

// Resolve the repo-root content dir from the module location, not CWD, so the
// test works both standalone and via `bun run test` (workspace filter).
const REAL_CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

/**
 * Every page the front-end routes to must parse, or its route 404s in
 * production: an edit that drops `title` or `updated` fails here first.
 */
describe("shipped standalone pages", () => {
  for (const slug of STANDALONE_PAGE_SLUGS) {
    test(`content/pages/${slug}.md has a title, an updated date, and a body`, async () => {
      const page = await getPageBySlug(slug, REAL_CONTENT_DIR);

      expect(page).not.toBeNull();
      expect(Number.isNaN(Date.parse(page!.updated))).toBe(false);
      expect(page!.body.trim()).not.toBe("");
    });
  }

  // STANDALONE_PAGE_SLUGS gives a page its client route, its server route and its
  // sitemap entry. A slug without a file is served and listed as a page that says
  // "not found"; a file without a slug has no route, so no visitor reaches it.
  test("content/pages holds a file for every routed slug and no other", () => {
    const files = readdirSync(resolve(REAL_CONTENT_DIR, PAGES_DIR)).filter((file) => file.endsWith(".md"));

    expect(files.map((file) => file.slice(0, -".md".length)).sort()).toEqual([...STANDALONE_PAGE_SLUGS].sort());
  });
});
