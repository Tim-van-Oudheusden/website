import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";

/** How many related articles the end-of-article block lists. */
export const RELATED_ARTICLES_COUNT = 3;

/**
 * The newest `RELATED_ARTICLES_COUNT` other articles sharing `current`'s
 * category, in listing order.
 */
export function selectRelatedArticles(
  articles: readonly ArticleSummary[],
  current: Pick<ArticleSummary, "slug" | "category">,
): ArticleSummary[] {
  return articles
    .filter((article) => article.category === current.category && article.slug !== current.slug)
    .sort(compareArticles)
    .slice(0, RELATED_ARTICLES_COUNT);
}
