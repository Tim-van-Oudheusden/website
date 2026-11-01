import { readdir, readFile } from "fs/promises";
import { basename, join } from "path";

import { ARTICLE_CATEGORIES, CONTENT_TYPES, PROJECT_LINK_TYPES, PROJECT_STATUSES } from "shared";
import type { ArticleCategory, ContentFrontmatter, ContentType, ProjectLink } from "shared";
import { tagSlug } from "shared/tags";

import type { ParseResult } from "./frontmatter";
import { readFrontmatter } from "./frontmatter";
import { rewriteObsidianImageEmbeds } from "./obsidian";

/** Content item with frontmatter only (for listing pages). */
export type ContentListItem = ContentFrontmatter;

/** Content item with frontmatter and raw markdown body. */
export type ContentItem = ContentFrontmatter & { body: string };

/** Filters for listing content; `type: null` lists every content type. */
export interface ListContentOptions {
  type: ContentType | null;
}

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A frontmatter date: a zero-padded `YYYY-MM-DD` day that exists on the
 * calendar. The front-end formats it with Intl, which throws on an invalid
 * date, and `Date` rolls "2026-02-30" over and reads "2026-10-2" as local time,
 * so anything else is null.
 */
export function normalizeDate(value: unknown): string | null {
  if (typeof value === "string") {
    const day = value.trim();

    if (!CALENDAR_DAY_PATTERN.test(day)) {
      return null;
    }

    const parsed = new Date(day);

    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(day) ? day : null;
  }

  return null;
}

export function normalizeString(value: unknown): string | null {
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

type ProjectLinksResult
  = | { ok: true; links: ProjectLink[] }
    | { ok: false; message: string; value: unknown };

/**
 * Read the `links:` list. Like an unknown `status`, a link the project page
 * cannot render is reported rather than silently left off the page.
 */
function normalizeProjectLinks(value: unknown): ProjectLinksResult {
  if (value === undefined) {
    return { ok: true, links: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, message: "links must be a list of `- type: ...` blocks, each with a label and an href", value };
  }

  const links: ProjectLink[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, message: "Each link must be a `- type: ...` block with a label and an href", value: item };
    }

    const rawLink = item as Record<string, unknown>;
    const type = PROJECT_LINK_TYPES.find((candidate) => candidate === rawLink["type"]);

    if (type === undefined) {
      return { ok: false, message: `Link type must be one of ${PROJECT_LINK_TYPES.join(", ")}`, value: item };
    }

    const label = normalizeString(rawLink["label"]);

    if (label === null) {
      return { ok: false, message: "Link must have a text label", value: item };
    }

    const href = normalizeString(rawLink["href"]);

    if (href === null) {
      return { ok: false, message: "Link must have a text href", value: item };
    }

    links.push({ type, label, href });
  }

  return { ok: true, links };
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

/** Text fields every content type reads. */
const COMMON_TEXT_FIELDS = ["title", "description", "slug", "socialImage"] as const;

/** Text fields only projects read. */
const PROJECT_TEXT_FIELDS = ["coverImage", "coverImageAlt", "role", "info"] as const;

/**
 * The parser reads an unquoted `2025` or `true` as a number or boolean, which
 * `normalizeString` would treat as absent: `slug: 2025` silently served the
 * file name and `description: 42` became empty (#835). Reject such a value in
 * a text field instead, telling the author to quote it.
 */
function rejectNonTextField(
  file: string,
  raw: Record<string, unknown>,
  fields: readonly string[],
): NormalizeResult | null {
  for (const field of fields) {
    const value = raw[field];

    if (typeof value === "number" || typeof value === "boolean") {
      return {
        ok: false,
        error: {
          file,
          field,
          message: `${field} must be text; put the value in quotes, e.g. ${field}: "${String(value)}"`,
          value,
        },
      };
    }
  }

  return null;
}

type MarkdownFileResult
  = | { ok: true; parsed: ParseResult }
    | { ok: false; error: ContentError };

async function readMarkdownFile(contentDir: string, file: string): Promise<MarkdownFileResult> {
  const raw = await readFile(join(contentDir, file), "utf-8");
  const read = readFrontmatter(raw);

  if (!read.ok) {
    return { ok: false, error: { file, field: null, message: read.reason, value: undefined } };
  }

  return { ok: true, parsed: read.result };
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

  const nonTextCommonField = rejectNonTextField(file, raw, COMMON_TEXT_FIELDS);

  if (nonTextCommonField !== null) {
    return nonTextCommonField;
  }

  const title = normalizeString(raw["title"]);

  if (title === null) {
    return reject(file, "title", "Missing required title");
  }

  for (const field of ["date", "publishDate"]) {
    if (normalizeString(raw[field]) !== null && normalizeDate(raw[field]) === null) {
      return {
        ok: false,
        error: { file, field, message: `${field} must be a YYYY-MM-DD calendar day`, value: raw[field] },
      };
    }
  }

  const date = normalizeDate(raw["date"]) ?? normalizeDate(raw["publishDate"]);

  if (date === null) {
    return reject(file, "date", "Missing required date or publishDate");
  }

  const description = normalizeString(raw["description"]) ?? "";
  const rawTags = raw["tags"];

  // The frontmatter subset has no flow lists, so `tags: [a, b]` arrives as one
  // string; reject it rather than silently publishing the document untagged.
  if (rawTags !== undefined && !Array.isArray(rawTags)) {
    return {
      ok: false,
      error: { file, field: "tags", message: "tags must be a list written one `- item` per line", value: rawTags },
    };
  }

  const tagItems: unknown[] = rawTags ?? [];
  const tags = tagItems.filter((tag): tag is string => typeof tag === "string");

  if (tags.length !== tagItems.length) {
    const nonTextTag = tagItems.find((tag) => typeof tag !== "string");
    // A `- key: value` item parses as an object; numbers and booleans are
    // unquoted scalars.
    const message = typeof nonTextTag === "number" || typeof nonTextTag === "boolean"
      ? `Tag must be text; put it in quotes, e.g. - "${String(nonTextTag)}"`
      : "Tag must be text; quote a tag that contains ': ', e.g. - \"Accessibility: WCAG\"";

    return { ok: false, error: { file, field: "tags", message, value: nonTextTag } };
  }

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
        homeRecommended: normalizeBoolean(raw["homeRecommended"], false),
      },
    };
  }

  const nonTextProjectField = rejectNonTextField(file, raw, PROJECT_TEXT_FIELDS);

  if (nonTextProjectField !== null) {
    return nonTextProjectField;
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

  const links = normalizeProjectLinks(raw["links"]);

  if (!links.ok) {
    return { ok: false, error: { file, field: "links", message: links.message, value: links.value } };
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
      links: links.links,
      info: normalizeString(raw["info"]),
      prioritySlot,
    },
  };
}

/** One directory entry after the read-and-normalize walk: its raw body plus its result. */
interface ContentDocument {
  file: string;
  rawBody: string;
  result: NormalizeResult;
}

/**
 * Single read-and-normalize walk shared by every content.ts entry point:
 * list `.md` files, read each, and normalize its frontmatter. Each caller
 * folds over the result list instead of repeating the walk itself.
 */
async function loadContentDocuments(contentDir: string): Promise<ContentDocument[]> {
  const files = await readdir(contentDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const documents: ContentDocument[] = [];

  for (const file of mdFiles) {
    const document = await readMarkdownFile(contentDir, file);

    if (!document.ok) {
      documents.push({ file, rawBody: "", result: { ok: false, error: document.error } });

      continue;
    }

    documents.push({
      file,
      rawBody: document.parsed.content,
      result: normalizeContentDocument(file, document.parsed.data),
    });
  }

  return documents;
}

/**
 * Characters that change what a URL path segment means. The SPA links to
 * `/articles/<slug>` without encoding it, so a slug holding one of these routes
 * to the wrong page (or none) even though the API would serve it.
 */
const UNROUTABLE_SLUG_CHARACTERS = /[/?#%\\]/;

/**
 * Slug errors for documents that are otherwise valid: a slug that cannot be a
 * URL path segment, or a published document reusing an earlier published
 * document's slug. `getContentBySlug` serves the first match, so the later one
 * is unreachable. Drafts never claim a slug: in production `getContentBySlug`
 * skips them, so a draft rewrite may share its published article's slug.
 */
function findSlugErrors(documents: readonly ContentDocument[]): ContentError[] {
  const firstFileBySlug = new Map<string, string>();
  const errors: ContentError[] = [];

  for (const { file, result } of documents) {
    if (!result.ok) {
      continue;
    }

    const { slug } = result.value;

    if (UNROUTABLE_SLUG_CHARACTERS.test(slug)) {
      errors.push({
        file,
        field: "slug",
        message: 'Slug contains "/", "?", "#", "%" or "\\", which cannot appear in a URL path segment; set a "slug"',
        value: slug,
      });

      continue;
    }

    if (result.value.draft) {
      continue;
    }

    const firstFile = firstFileBySlug.get(slug);

    if (firstFile !== undefined) {
      errors.push({ file, field: "slug", message: `Slug is already used by ${firstFile}`, value: slug });

      continue;
    }

    firstFileBySlug.set(slug, file);
  }

  return errors;
}

/**
 * Spellings of one tag: letter case, spaces, hyphens and underscores aside,
 * "Content API", "content-api" and "content_API" are the same tag.
 */
function tagSpelling(tag: string): string {
  return tag.normalize("NFC").toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

/**
 * Tag errors for articles, whose tag badges link to `/tags/<slug>` (project
 * tags link nowhere). A tag with an empty slug links to `/tags/`, which no
 * route serves; two different tags sharing a slug ("NET" and ".NET") share one
 * page, headed by whichever the newest article carries. Drafts are checked
 * too: their tags show in local dev and go live once published.
 */
function findTagErrors(documents: readonly ContentDocument[]): ContentError[] {
  const firstTagBySlug = new Map<string, { tag: string; file: string }>();
  const errors: ContentError[] = [];

  for (const { file, result } of documents) {
    if (!result.ok || result.value.type !== "article") {
      continue;
    }

    for (const tag of result.value.tags) {
      const slug = tagSlug(tag);

      if (slug === "") {
        errors.push({
          file,
          field: "tags",
          message: 'Tag has no letter, digit, "+" or "#", so its /tags/ link would be empty',
          value: tag,
        });

        continue;
      }

      const first = firstTagBySlug.get(slug);

      if (first === undefined) {
        firstTagBySlug.set(slug, { tag, file });

        continue;
      }

      if (tagSpelling(first.tag) !== tagSpelling(tag)) {
        errors.push({
          file,
          field: "tags",
          message: `Tag shares the page /tags/${slug} with tag "${first.tag}" in ${first.file}; use one spelling`,
          value: tag,
        });
      }
    }
  }

  return errors;
}

/**
 * Audit every markdown document in a directory, returning the errors for any
 * document `listContent` would skip or `getContentBySlug` could never serve.
 * Empty array means all documents are valid.
 */
export async function validateContentDir(contentDir: string): Promise<ContentError[]> {
  const documents = await loadContentDocuments(contentDir);

  const documentErrors = documents
    .filter((document): document is ContentDocument & { result: { ok: false; error: ContentError } } =>
      !document.result.ok)
    .map((document) => document.result.error);

  return [...documentErrors, ...findSlugErrors(documents), ...findTagErrors(documents)];
}

/**
 * List all content items with frontmatter only (no body).
 * Invalid documents are skipped, never fatal. Filters out drafts when
 * NODE_ENV is "production". Filters by content type unless `options.type` is null.
 */
export async function listContent(contentDir: string, options: ListContentOptions): Promise<ContentListItem[]> {
  const documents = await loadContentDocuments(contentDir);

  const items: ContentListItem[] = [];

  for (const document of documents) {
    if (!document.result.ok) {
      continue;
    }

    const frontmatter = document.result.value;

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
 * Skips drafts when NODE_ENV is "production", so a published document sharing
 * a draft's slug still resolves whatever order the files are read in.
 */
export async function getContentBySlug(
  slug: string,
  contentDir: string,
): Promise<ContentItem | null> {
  const documents = await loadContentDocuments(contentDir);

  for (const document of documents) {
    if (!document.result.ok) {
      continue;
    }

    const frontmatter = document.result.value;

    if (frontmatter.slug !== slug) {
      continue;
    }

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      continue;
    }

    return { ...frontmatter, body: rewriteObsidianImageEmbeds(document.rawBody) };
  }

  return null;
}
