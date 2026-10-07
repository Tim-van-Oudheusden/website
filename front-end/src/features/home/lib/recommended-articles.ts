import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";

/** How many recommended articles the for-you section shows. */
export const RECOMMENDED_ARTICLES_COUNT = 3;

/**
 * Curated pool the for-you section picks its recommendations from on every
 * page load: every article whose own frontmatter opts it in, in listing
 * order. Mirrors how `resolveFeaturedProject`/`resolvePriorityProjects`
 * (projects/lib/project-display.ts) read editorial priority from content
 * instead of a code-owned list.
 */
export function resolveRecommendedPool(articles: readonly ArticleSummary[]): readonly string[] {
  return articles.filter((article) => article.homeRecommended).map((article) => article.slug);
}

/**
 * Resolve a curated slug list to articles, preserving the stated slug order,
 * skipping slugs that do not exist in the real content, and listing each
 * article once.
 */
export function resolveCuratedArticles(articles: ArticleSummary[], slugOrder: readonly string[]): ArticleSummary[] {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));

  return [...new Set(slugOrder)].flatMap((slug) => bySlug.get(slug) ?? []);
}

/**
 * Pick `RECOMMENDED_ARTICLES_COUNT` articles at random from the curated `pool`;
 * when the pool resolves to fewer, fill with the newest other articles.
 * `random` returns a number in [0, 1) like `Math.random`; inject a fixed source
 * for deterministic results.
 */
export function selectRecommendedArticles(
  articles: ArticleSummary[],
  pool: readonly string[],
  random: () => number,
): ArticleSummary[] {
  const candidates = resolveCuratedArticles(articles, pool);

  // Fisher–Yates shuffle, so every ordering of the pool is equally likely.
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = candidates[index];
    const swapped = candidates[swapIndex];

    if (current !== undefined && swapped !== undefined) {
      candidates[index] = swapped;
      candidates[swapIndex] = current;
    }
  }

  const picked = candidates.slice(0, RECOMMENDED_ARTICLES_COUNT);
  const newestOthers = articles.filter((article) => !picked.includes(article)).sort(compareArticles);

  return [...picked, ...newestOthers].slice(0, RECOMMENDED_ARTICLES_COUNT);
}
