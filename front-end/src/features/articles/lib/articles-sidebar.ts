import type { ArticleCategory } from "shared";
import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_SLUG } from "shared";
import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";

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
    "Introduction": [],
    "Linux": [],
    "Work": [],
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
