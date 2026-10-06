import { readdir, readFile } from "fs/promises";
import { basename, join } from "path";

import { ARTICLE_CATEGORIES, CONTENT_TYPES, PROJECT_LINK_TYPES, PROJECT_STATUSES } from "shared";
import type { ArticleCategory, ContentFrontmatter, ContentType, ProjectLink } from "shared";

import { parseFrontmatter } from "./frontmatter";
import { rewriteObsidianImageEmbeds } from "./obsidian";

/** Content item with frontmatter only (for listing pages). */
export type ContentListItem = ContentFrontmatter;

/** Content item with frontmatter and raw markdown body. */
export type ContentItem = ContentFrontmatter & { body: string };

/** Filters for listing content; `type: null` lists every content type. */
export interface ListContentOptions {
  type: ContentType | null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return null;
}

function normalizeTimeframe(value: unknown): string | null {
  const stringValue = normalizeString(value);

  if (stringValue !== null) {
    return stringValue;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
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

function normalizePrioritySlot(value: unknown): 1 | 2 | 3 | null {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return null;
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
      || label === null
      || href === null
    ) {
      return [];
    }

    return [{ type: type as ProjectLink["type"], label, href }];
  });
}

export interface ContentError {
  file: string;
  /** The offending frontmatter field; null when the document as a whole is invalid. */
  field: string | null;
  message: string;
  /** The offending raw value; `undefined` when the error is about a missing field. */
  value: unknown;
}

export type NormalizeResult
  = | { ok: true; value: ContentFrontmatter }
    | { ok: false; error: ContentError };

function reject(file: string, field: string | null, message: string): NormalizeResult {
  return { ok: false, error: { file, field, message, value: undefined } };
}

interface ParsedContentFile {
  raw: string;
  parsed: NonNullable<ReturnType<typeof parseFrontmatter>>;
}

async function readMarkdownFile(contentDir: string, file: string): Promise<ParsedContentFile | null> {
  const raw = await readFile(join(contentDir, file), "utf-8");
  const parsed = parseFrontmatter(raw);

  if (parsed === null) {
    return null;
  }

  return { raw, parsed };
}

/**
 * Total normalizer: never throws; every structurally invalid document is
 * reported as an error instead of being silently dropped or crashing the
 * caller. Known-good fallbacks (empty description, draft/featured false) are
 * applied for absent optional fields.
 */
export function normalizeContentDocument(file: string, value: unknown): NormalizeResult {
  if (typeof value !== "object" || value === null) {
    return reject(file, null, "Frontmatter is not an object");
  }

  const raw = value as Record<string, unknown>;

  const title = normalizeString(raw["title"]);

  if (title === null) {
    return reject(file, "title", "Missing required title");
  }

  const date = normalizeDate(raw["date"]) ?? normalizeDate(raw["publishDate"]);

  if (date === null) {
    return reject(file, "date", "Missing required date or publishDate");
  }

  const description = normalizeString(raw["description"]) ?? "";
  const tags = Array.isArray(raw["tags"])
    ? raw["tags"].filter((tag): tag is string => typeof tag === "string")
    : [];
  const type: ContentType = CONTENT_TYPES.find((candidate) => candidate === raw["type"]) ?? "article";
  const draft = normalizeBoolean(raw["draft"], false);
  const socialImage = normalizeString(raw["socialImage"]);
  const slug = normalizeString(raw["slug"]) ?? basename(file, ".md");

  if (type === "article") {
    const category = normalizeString(raw["category"]);

    if (category === null || !(ARTICLE_CATEGORIES as readonly string[]).includes(category)) {
      return reject(file, "category", 'Article must declare a valid "category"');
    }

    return {
      ok: true,
      value: {
        title,
        description,
        date,
        tags,
        type,
        draft,
        category: category as ArticleCategory,
        slug,
        socialImage,
      },
    };
  }

  const coverImage = normalizeString(raw["coverImage"]);
  const coverImageAlt = normalizeString(raw["coverImageAlt"]);

  if (coverImage === null || coverImageAlt === null) {
    return reject(file, "coverImage", 'Project must declare "coverImage" and "coverImageAlt"');
  }

  const rawStatus = raw["status"];
  const status = normalizeString(rawStatus);
  const projectStatus = status === null
    ? null
    : PROJECT_STATUSES.find((candidate) => candidate === status) ?? null;

  if (rawStatus !== undefined && projectStatus === null) {
    return { ok: false, error: { file, field: "status", message: "Unknown project status value", value: rawStatus } };
  }

  const prioritySlot = normalizePrioritySlot(raw["prioritySlot"]);

  if (raw["prioritySlot"] !== undefined && prioritySlot === null) {
    return {
      ok: false,
      error: { file, field: "prioritySlot", message: "prioritySlot must be 1, 2, or 3", value: raw["prioritySlot"] },
    };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      date,
      tags,
      type,
      draft,
      slug,
      socialImage,
      coverImage,
      coverImageAlt,
      featured: normalizeBoolean(raw["featured"], false),
      projectOrder: normalizeNumber(raw["projectOrder"], 0),
      status: projectStatus,
      role: normalizeString(raw["role"]),
      created: normalizeTimeframe(raw["created"]),
      links: normalizeProjectLinks(raw["links"]),
      info: normalizeString(raw["info"]),
      prioritySlot,
    },
  };
}

/**
 * Audit every markdown document in a directory, returning the errors for any
 * document `listContent` would skip. Empty array means all documents are valid.
 */
export async function validateContentDir(contentDir: string): Promise<ContentError[]> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const errors: ContentError[] = [];

  for (const file of mdFiles) {
    const document = await readMarkdownFile(contentDir, file);

    if (document === null) {
      continue;
    }

    const result = normalizeContentDocument(file, document.parsed.data);

    if (!result.ok) {
      errors.push(result.error);
    }
  }

  return errors;
}

/**
 * List all content items with frontmatter only (no body).
 * Invalid documents are skipped, never fatal. Filters out drafts when
 * NODE_ENV is "production". Filters by content type unless `options.type` is null.
 */
export async function listContent(contentDir: string, options: ListContentOptions): Promise<ContentListItem[]> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const items: ContentListItem[] = [];

  for (const file of mdFiles) {
    const document = await readMarkdownFile(contentDir, file);

    if (document === null) {
      continue;
    }

    const result = normalizeContentDocument(file, document.parsed.data);

    if (!result.ok) {
      continue;
    }

    const frontmatter = result.value;

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      continue;
    }

    if (options.type !== null && frontmatter.type !== options.type) {
      continue;
    }

    items.push(frontmatter);
  }

  return items;
}

/**
 * Get a single content item by slug, including the raw markdown body.
 * Returns null if no matching file is found or the document is invalid.
 * Filters out drafts when NODE_ENV is "production".
 */
export async function getContentBySlug(
  slug: string,
  contentDir: string,
): Promise<ContentItem | null> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    const document = await readMarkdownFile(contentDir, file);

    if (document === null) {
      continue;
    }

    const result = normalizeContentDocument(file, document.parsed.data);

    if (!result.ok) {
      continue;
    }

    const frontmatter = result.value;

    if (frontmatter.slug !== slug) {
      continue;
    }

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      return null;
    }

    return { ...frontmatter, body: rewriteObsidianImageEmbeds(document.parsed.content) };
  }

  return null;
}
