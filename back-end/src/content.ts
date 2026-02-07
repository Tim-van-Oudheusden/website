import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import matter from "gray-matter";
import type { ContentFrontmatter, ContentType } from "shared";
import { rewriteObsidianImageEmbeds } from "./obsidian";

/** Content item with frontmatter only (for listing pages). */
export type ContentListItem = ContentFrontmatter;

/** Content item with frontmatter and raw markdown body. */
export interface ContentItem extends ContentFrontmatter {
  body: string;
}

/** Optional filters for listing content. */
export interface ListContentOptions {
  type?: ContentType | undefined;
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
    const frontmatter = data as ContentFrontmatter;

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      continue;
    }

    if (options?.type !== undefined && frontmatter.type !== options.type) {
      continue;
    }

    const slug = frontmatter.slug ?? basename(file, ".md");

    items.push({
      title: frontmatter.title,
      description: frontmatter.description,
      date: frontmatter.date,
      tags: frontmatter.tags,
      type: frontmatter.type,
      draft: frontmatter.draft,
      slug,
    });
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
    const frontmatter = data as ContentFrontmatter;

    const fileSlug = frontmatter.slug ?? basename(file, ".md");
    if (fileSlug !== slug) continue;

    if (process.env.NODE_ENV === "production" && frontmatter.draft) {
      return null;
    }

    return {
      title: frontmatter.title,
      description: frontmatter.description,
      date: frontmatter.date,
      tags: frontmatter.tags,
      type: frontmatter.type,
      draft: frontmatter.draft,
      slug: fileSlug,
      body: rewriteObsidianImageEmbeds(content),
    };
  }

  return null;
}
