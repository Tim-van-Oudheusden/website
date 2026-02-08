import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import matter from "gray-matter";
import { ARTICLE_CATEGORIES } from "shared";
import type { ArticleCategory, ContentFrontmatter, ContentType } from "shared";
import { rewriteObsidianImageEmbeds } from "./obsidian";

/** Content item with frontmatter only (for listing pages). */
export type ContentListItem = ContentFrontmatter;

/** Content item with frontmatter and raw markdown body. */
export type ContentItem = ContentFrontmatter & { body: string };

/** Optional filters for listing content. */
export interface ListContentOptions {
  type?: ContentType | undefined;
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}

function normalizeFrontmatter(file: string, value: unknown): ContentFrontmatter | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;

  let title: string | undefined;
  if (typeof raw["title"] === "string") {
    title = raw["title"];
  }
  const date = normalizeDate(raw["date"]) ?? normalizeDate(raw["publishDate"]);
  if (title === undefined || date === undefined) {
    return null;
  }

  let description = "";
  if (typeof raw["description"] === "string") {
    description = raw["description"];
  }

  let tags: string[] = [];
  if (Array.isArray(raw["tags"])) {
    tags = raw["tags"].filter((tag): tag is string => typeof tag === "string");
  }

  let type: ContentType = "article";
  if (raw["type"] === "article" || raw["type"] === "project") {
    type = raw["type"];
  }

  let draft = false;
  if (typeof raw["draft"] === "boolean") {
    draft = raw["draft"];
  }

  let category: ArticleCategory | undefined;
  if (
    typeof raw["category"] === "string"
    && (ARTICLE_CATEGORIES as readonly string[]).includes(raw["category"])
  ) {
    category = raw["category"] as ArticleCategory;
  }

  let slug = basename(file, ".md");
  if (typeof raw["slug"] === "string" && raw["slug"] !== "") {
    slug = raw["slug"];
  }

  if (type === "article") {
    if (category === undefined) {
      throw new Error(`Article "${file}" is missing a valid category`);
    }

    return { title, description, date, tags, type, draft, category, slug };
  }

  return { title, description, date, tags, type, draft, slug };
}

/**
 * List all content items with frontmatter only (no body).
 * Filters out drafts when NODE_ENV is "production".
 * Optionally filters by content type.
 */
export async function listContent(contentDir: string, options?: ListContentOptions): Promise<ContentListItem[]> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const items: ContentListItem[] = [];

  for (const file of mdFiles) {
    const raw = await readFile(join(contentDir, file), "utf-8");
    const { data } = matter(raw);
    const frontmatter = normalizeFrontmatter(file, data);
    if (frontmatter === null) {
      continue;
    }

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      continue;
    }

    if (options?.type !== undefined && frontmatter.type !== options.type) {
      continue;
    }

    items.push(frontmatter);
  }

  return items;
}

/**
 * Get a single content item by slug, including the raw markdown body.
 * Returns null if no matching file is found.
 * Filters out drafts when NODE_ENV is "production".
 */
export async function getContentBySlug(
  slug: string,
  contentDir: string,
): Promise<ContentItem | null> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const raw = await readFile(join(contentDir, file), "utf-8");
    const { data, content } = matter(raw);
    const frontmatter = normalizeFrontmatter(file, data);
    if (frontmatter === null) {
      continue;
    }

    if (frontmatter.slug !== slug) continue;

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      return null;
    }

    return { ...frontmatter, body: rewriteObsidianImageEmbeds(content) };
  }

  return null;
}
