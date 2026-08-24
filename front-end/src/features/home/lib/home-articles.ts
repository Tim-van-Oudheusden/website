import { ROUTES } from "shared";
import type { ArticleSummary } from "@/features/articles/articles-sidebar";
import { apiGet } from "@/shared/lib/api";

/**
 * Sort article summaries newest-first by date, falling back to slug order for
 * ties or unparseable dates. Returns a new array; the input is never mutated.
 */
export function sortArticleSummariesDesc(articles: ArticleSummary[]): ArticleSummary[] {
  return [...articles].sort((a, b) => {
    const dateA = Date.parse(a.date);
    const dateB = Date.parse(b.date);

    if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
      return dateB - dateA;
    }

    return a.slug.localeCompare(b.slug);
  });
}

/** Fetch the site's real articles from the content API. */
export async function fetchHomeArticlesAsync(): Promise<ArticleSummary[]> {
  const data = await apiGet<ArticleSummary[]>(`${ROUTES.CONTENT}?type=article`);
  return data.filter((item): item is ArticleSummary => typeof item.slug === "string");
}