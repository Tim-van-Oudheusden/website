import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_SLUG, compareArticles } from "shared";
import type { ArticleCategory, ArticleSummary } from "shared";

export function getDefaultArticleSlug(articles: ArticleSummary[]): string | null {
  const intro = articles.find((article) => article.slug === DEFAULT_ARTICLE_SLUG);
  if (intro !== undefined) {
    return intro.slug;
  }

  const sorted = [...articles].sort(compareArticles);
  return sorted[0]?.slug ?? null;
}

/** Resolve the article the location trail jumps to when "Articles" is clicked. */
export function resolveArticlesTrailTargetSlug(articles: ArticleSummary[]): string | null {
  return getDefaultArticleSlug(articles);
}

export function groupArticlesByCategory(
  articles: ArticleSummary[],
): Record<ArticleCategory, ArticleSummary[]> {
  const grouped: Record<ArticleCategory, ArticleSummary[]> = {
    Introduction: [],
    Linux: [],
    Work: [],
    "Personal Life": [],
  };

  for (const article of [...articles].sort(compareArticles)) {
    const category = article.category;
    if (!ARTICLE_CATEGORIES.includes(category)) {
      continue;
    }

    grouped[category].push(article);
  }

  return grouped;
}