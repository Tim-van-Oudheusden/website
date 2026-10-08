import { readFile } from "fs/promises";
import { join } from "path";

import type { PageData } from "shared";

import { normalizeDate, normalizeString } from "../content/content";
import { readFrontmatter } from "../content/frontmatter";
import { rewriteObsidianImageEmbeds } from "../content/obsidian";

/** Folder under the content directory holding standalone pages (/now, /uses). */
export const PAGES_DIR = "pages";

/** Lowercase kebab-case only, so a slug can never name a path outside PAGES_DIR. */
const PAGE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readPageFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "EISDIR")
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Read `content/pages/<slug>.md`. Returns null when the slug is malformed, the
 * file is absent, or its frontmatter lacks the required `title` and `updated`.
 */
export async function getPageBySlug(slug: string, contentDir: string): Promise<PageData | null> {
  if (!PAGE_SLUG_PATTERN.test(slug)) {
    return null;
  }

  const raw = await readPageFile(join(contentDir, PAGES_DIR, `${slug}.md`));

  if (raw === null) {
    return null;
  }

  const read = readFrontmatter(raw);

  if (!read.ok) {
    return null;
  }

  const { data, content } = read.result;
  const title = normalizeString(data["title"]);
  const updated = normalizeDate(data["updated"]);

  if (title === null || updated === null) {
    return null;
  }

  return {
    slug,
    title,
    description: normalizeString(data["description"]) ?? "",
    updated,
    body: rewriteObsidianImageEmbeds(content),
  };
}
