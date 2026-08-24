import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { parseFrontmatter } from "./frontmatter";
import { ARTICLE_CATEGORIES, PROJECT_LINK_TYPES, PROJECT_STATUSES } from "shared";
import type { ArticleCategory, ContentFrontmatter, ContentType, ProjectLink, ProjectStatus } from "shared";
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

function normalizeString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return undefined;
}

function normalizeTimeframe(value: unknown): string | undefined {
  const stringValue = normalizeString(value);
  if (stringValue !== undefined) {
    return stringValue;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function normalizeProjectStatus(value: unknown): ProjectStatus | undefined {
  if (typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value)) {
    return value as ProjectStatus;
  }

  return undefined;
}

function normalizeProjectLinks(value: unknown): ProjectLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): ProjectLink[] => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const rawLink = item as Record<string, unknown>;
    const type = rawLink["type"];
    const label = normalizeString(rawLink["label"]);
    const href = normalizeString(rawLink["href"]);

    if (
      typeof type !== "string"
      || !(PROJECT_LINK_TYPES as readonly string[]).includes(type)
      || label === undefined
      || href === undefined
    ) {
      return [];
    }

    return [{ type: type as ProjectLink["type"], label, href }];
  });
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

  const coverImage = normalizeString(raw["coverImage"]);
  const coverImageAlt = normalizeString(raw["coverImageAlt"]);
  if (coverImage === undefined || coverImageAlt === undefined) {
    throw new Error(`Project "${file}" is missing coverImage or coverImageAlt`);
  }

  return {
    title,
    description,
    date,
    tags,
    type,
    draft,
    slug,
    coverImage,
    coverImageAlt,
    featured: normalizeBoolean(raw["featured"], false),
    projectOrder: normalizeNumber(raw["projectOrder"], 0),
    status: normalizeProjectStatus(raw["status"]),
    role: normalizeString(raw["role"]),
    created: normalizeTimeframe(raw["created"]),
    links: normalizeProjectLinks(raw["links"]),
    info: normalizeString(raw["info"]),
  };
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
    const parsed = parseFrontmatter(raw);
    if (parsed === null) {
      continue;
    }
    const frontmatter = normalizeFrontmatter(file, parsed.data);
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
    const parsed = parseFrontmatter(raw);
    if (parsed === null) {
      continue;
    }
    const frontmatter = normalizeFrontmatter(file, parsed.data);
    if (frontmatter === null) {
      continue;
    }

    if (frontmatter.slug !== slug) continue;

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      return null;
    }

    return { ...frontmatter, body: rewriteObsidianImageEmbeds(parsed.content) };
  }

  return null;
}
