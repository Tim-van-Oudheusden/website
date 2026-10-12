import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";

/**
 * The URL form of a tag: lowercase, every run of non-letters/digits one hyphen.
 * Authored tags ("Content API") and route params ("content-api", "Content-API")
 * both pass through it, so matching is case-insensitive by construction.
 */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

/** Client route of the page listing every article carrying `tag`. */
export function tagPath(tag: string): string {
  return `/tags/${encodeURIComponent(tagSlug(tag))}`;
}

/** Articles carrying `tag` (an authored tag or its slug), in listing order. */
export function selectArticlesByTag(articles: readonly ArticleSummary[], tag: string): ArticleSummary[] {
  const slug = tagSlug(tag);

  return articles
    .filter((article) => article.tags.some((articleTag) => tagSlug(articleTag) === slug))
    .sort(compareArticles);
}
