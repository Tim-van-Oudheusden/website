import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/api";
import { httpContentLoader } from "@/shared/lib/content-loader";
import type { ArticleData, ArticleSummary } from "shared/articles";
import { getDefaultArticleSlug } from "../lib/articles-sidebar";

export interface UseArticlesResult {
  articles: ArticleSummary[];
  selectedSlug: string | null;
  selectedArticle: ArticleData | null;
  loadingArticles: boolean;
  loadingArticle: boolean;
  listError: string | null;
  articleError: string | null;
  selectSlug: (slug: string) => void;
}

/**
 * Listing + selected-article fetch lifecycle for the Articles page.
 *
 * Selects the URL slug when present (otherwise the API-driven default), then loads
 * the selected article's body. All three transitions are observable from the
 * returned tuple; the page stays a pure composition of the result.
 */
export function useArticles(urlSlug: string | undefined): UseArticlesResult {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(urlSlug ?? null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);

  // React to URL changes only: an in-page selectSlug must not be reverted
  // while the URL still names the slug the page was opened on.
  useEffect(() => {
    if (urlSlug !== undefined) {
      setSelectedSlug(urlSlug);
    }
  }, [urlSlug]);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticles(): Promise<void> {
      try {
        const items = await httpContentLoader.listArticles();

        if (!cancelled) {
          setArticles(items);
          setSelectedSlug((current) => current ?? getDefaultArticleSlug(items));
        }
      } catch (err) {
        if (!cancelled) {
          let message = "Failed to load articles";

          if (err instanceof ApiError) {
            message = err.message;
          }

          setListError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingArticles(false);
        }
      }
    }

    void fetchArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedSlug === null) {
      setSelectedArticle(null);

      return;
    }

    const contentSlug = selectedSlug;
    let cancelled = false;

    setLoadingArticle(true);
    setArticleError(null);

    async function fetchArticle(): Promise<void> {
      try {
        const data = await httpContentLoader.getArticle(contentSlug);

        if (!cancelled) {
          setSelectedArticle(data);
        }
      } catch (err) {
        if (!cancelled) {
          let message = "Failed to load article";

          if (err instanceof ApiError) {
            message = err.message;
          }

          setArticleError(message);
          setSelectedArticle(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingArticle(false);
        }
      }
    }

    void fetchArticle();

    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const selectSlug = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  return {
    articles,
    selectedSlug,
    selectedArticle,
    loadingArticles,
    loadingArticle,
    listError,
    articleError,
    selectSlug,
  };
}
