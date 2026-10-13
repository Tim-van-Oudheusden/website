import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { getPageBySlug } from "../../../../../back-end/src/features/pages/pages";

/**
 * A page that cannot be found reads as "no page" (404), but any other read
 * failure must surface instead of being masked as a missing page.
 */
describe("getPageBySlug read errors", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-pages-errors-"));
  });

  afterEach(async () => {
    await rm(contentDir, { recursive: true, force: true });
  });

  test("returns null when the page path is a directory", async () => {
    await mkdir(join(contentDir, "pages", "now.md"), { recursive: true });

    expect(await getPageBySlug("now", contentDir)).toBeNull();
  });

  test("returns null when content/pages is a file, not a directory", async () => {
    await writeFile(join(contentDir, "pages"), "not a directory");

    expect(await getPageBySlug("now", contentDir)).toBeNull();
  });

  test("rethrows a read error other than a missing file", async () => {
    await mkdir(join(contentDir, "pages"));
    await symlink("now.md", join(contentDir, "pages", "now.md"));

    const error: unknown = await getPageBySlug("now", contentDir).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "ELOOP" });
  });
});

/** `updated` is formatted with Intl, which throws on a date that is not a real day. */
describe("getPageBySlug updated date", () => {
  let contentDir: string;

  beforeEach(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-pages-updated-"));
    await mkdir(join(contentDir, "pages"));
  });

  afterEach(async () => {
    await rm(contentDir, { recursive: true, force: true });
  });

  async function pageUpdated(updated: string) {
    await writeFile(join(contentDir, "pages", "now.md"), ["---", "title: Now", `updated: ${updated}`, "---", "Body"].join("\n"));

    return getPageBySlug("now", contentDir);
  }

  test.each(["2026-13-01", "13-10-2026", "2026-02-30", "2026-10-2", "soon"])(
    "returns null for an updated of %s",
    async (updated) => {
      expect(await pageUpdated(updated)).toBeNull();
    },
  );

  test("serves a YYYY-MM-DD updated", async () => {
    expect(await pageUpdated("2026-10-02")).toMatchObject({ slug: "now", updated: "2026-10-02" });
  });
});
