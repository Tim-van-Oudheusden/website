import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_SLUG } from "shared";
import type { ArticleCategory } from "shared";

export interface ArticleSummary {
  title: string;
  description: string;
  date: string;
  tags: string[];
  type: "article";
  draft: boolean;
  category: ArticleCategory;
  slug: string;
}

/** A full article: the summary fields plus the markdown body. */
export interface ArticleData extends ArticleSummary {
  body: string;
}

function compareArticles(a: ArticleSummary, b: ArticleSummary): number {
  const dateA = Date.parse(a.date);
  const dateB = Date.parse(b.date);

  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
    return dateB - dateA;
  }

  const titleDiff = a.title.localeCompare(b.title);
  if (titleDiff !== 0) {
    return titleDiff;
  }

  return a.slug.localeCompare(b.slug);
}

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
