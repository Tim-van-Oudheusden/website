import { useMemo, useState } from "react";

import type { ArticleData, ArticleSummary } from "shared/articles";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { ApiError } from "@/shared/lib/api";
import { httpContentLoader } from "@/shared/lib/content-loader";

import { getDefaultArticleSlug } from "../lib/articles-sidebar";

function loadArticles(): Promise<ArticleSummary[]> {
  return httpContentLoader.listArticles();
}

/** The article, or null when the API has no article under `slug`. */
async function loadArticleOrNull(slug: string): Promise<ArticleData | null> {
  try {
    return await httpContentLoader.getArticle(slug);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

const NO_ARTICLES: ArticleSummary[] = [];

export interface UseArticlesResult {
  articles: ArticleSummary[];
  selectedSlug: string | null;
  selectedArticle: ArticleData | null;
  loadingArticles: boolean;
  loadingArticle: boolean;
  listError: string | null;
  articleError: string | null;
  /** The selected slug names no article: show the not-found page, not an error. */
  articleNotFound: boolean;
}

/**
 * Listing + selected-article fetch lifecycle for the Articles page.
 *
 * Selects the URL slug when present (otherwise the API-driven default), then loads
 * the selected article's body. All three transitions are observable from the
 * returned tuple; the page stays a pure composition of the result.
 */
export function useArticles(urlSlug: string | undefined): UseArticlesResult {
  const [pickedSlug, setPickedSlug] = useState<string | null>(urlSlug ?? null);
  const [syncedUrlSlug, setSyncedUrlSlug] = useState(urlSlug);

  // React to URL changes only: a URL without a slug (`/articles` after
  // `/articles/<slug>`, same page instance) keeps the current selection.
  if (urlSlug !== syncedUrlSlug) {
    setSyncedUrlSlug(urlSlug);

    if (urlSlug !== undefined) {
      setPickedSlug(urlSlug);
    }
  }

  const list = useLoadOnMount(loadArticles, "Failed to load articles");
  const articles = list.data ?? NO_ARTICLES;
  const selectedSlug = pickedSlug ?? (list.data === null ? null : getDefaultArticleSlug(list.data));

  const loadSelectedArticle = useMemo(
    () => (selectedSlug === null ? null : () => loadArticleOrNull(selectedSlug)),
    [selectedSlug],
  );
  const article = useLoadOnMount(loadSelectedArticle, "Failed to load article");

  return {
    articles,
    selectedSlug,
    selectedArticle: article.data,
    loadingArticles: list.status === "loading",
    loadingArticle: article.status === "loading",
    listError: list.error,
    articleError: article.error,
    articleNotFound: article.status === "success" && article.data === null,
  };
}
