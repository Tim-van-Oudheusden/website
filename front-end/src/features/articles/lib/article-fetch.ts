import { ROUTES } from "shared";
import { apiGet } from "@/shared/lib/api";
import type { ArticleData, ArticleSummary } from "./articles-sidebar";

/** Fetch the article list, dropping malformed entries without a slug. */
export async function fetchArticleSummaries(): Promise<ArticleSummary[]> {
  const data = await apiGet<ArticleSummary[]>(`${ROUTES.CONTENT}?type=article`);
  return data.filter((item): item is ArticleSummary => typeof item.slug === "string");
}

/** Fetch a single article by slug; rejects with `ApiError(404)` when absent. */
export async function fetchArticleBySlug(slug: string): Promise<ArticleData> {
  const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", slug);
  return apiGet<ArticleData>(path);
}