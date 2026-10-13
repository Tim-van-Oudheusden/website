import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";
import { tagSlug } from "shared/tags";

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
