import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import { getPageBySlug } from "../../../../../back-end/src/features/pages/pages";

// Resolve the repo-root content dir from the module location, not CWD, so the
// test works both standalone and via `bun run test` (workspace filter).
const REAL_CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

/**
 * Every page the front-end routes to must parse, or its route 404s in
 * production: an edit that drops `title` or `updated` fails here first.
 */
describe("shipped standalone pages", () => {
  for (const slug of ["now", "uses"]) {
    test(`content/pages/${slug}.md has a title, an updated date, and a body`, async () => {
      const page = await getPageBySlug(slug, REAL_CONTENT_DIR);

      expect(page).not.toBeNull();
      expect(Number.isNaN(Date.parse(page!.updated))).toBe(false);
      expect(page!.body.trim()).not.toBe("");
    });
  }
});
