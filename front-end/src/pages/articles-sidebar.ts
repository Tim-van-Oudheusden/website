import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_SLUG } from "shared";
import type { ArticleCategory, ContentFrontmatter } from "shared";

export interface ArticleSummary extends ContentFrontmatter {
  category?: ArticleCategory | undefined;
  slug: string;
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

export function groupArticlesByCategory(
  articles: ArticleSummary[],
): Record<ArticleCategory, ArticleSummary[]> {
  const grouped: Record<ArticleCategory, ArticleSummary[]> = {
    Linux: [],
    Work: [],
    "Personal Life": [],
  };

  for (const article of [...articles].sort(compareArticles)) {
    const category = article.category;
    if (category === undefined || !ARTICLE_CATEGORIES.includes(category)) {
      continue;
    }

    grouped[category].push(article);
  }

  return grouped;
}
