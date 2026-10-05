/**
 * Shared article types and ordering.
 *
 * This module sits apart from index.ts so the back-end coverage run (which
 * imports only the constants from index.ts) never loads the front-end-only
 * article ordering logic.
 */
import type { ArticleFrontmatter } from "./index";

/** Article list item: the article contract plus a resolved slug. */
export type ArticleSummary = ArticleFrontmatter & { slug: string };

/** A full article: the summary fields plus the markdown body. */
export type ArticleData = ArticleSummary & { body: string };

/**
 * Newest-first article ordering with a documented tie-break.
 *
 * Dates are compared descending; when two dates are equal or unparseable,
 * titles sort ascending, then slugs ascending as the final tie-break.
 */
export function compareArticles(left: ArticleSummary, right: ArticleSummary): number {
  const leftTime = Date.parse(left.date);
  const rightTime = Date.parse(right.date);

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const titleDiff = left.title.localeCompare(right.title);

  if (titleDiff !== 0) {
    return titleDiff;
  }

  return left.slug.localeCompare(right.slug);
}
