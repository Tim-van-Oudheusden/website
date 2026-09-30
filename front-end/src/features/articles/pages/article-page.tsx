import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { ApiError } from "@/shared/lib/api";
import { Badge } from "@/shared/components/ui/badge";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { fetchArticleBySlug } from "../lib/article-fetch";
import type { ArticleData } from "../lib/articles-sidebar";

export const ARTICLE_PAGE_TYPOGRAPHY_CLASSES = {
  mainMeasure: "mx-auto w-full max-w-[75ch]",
  title: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  description: "text-muted-foreground mt-2 max-w-[65ch] text-base sm:text-lg leading-relaxed",
  metaTime: "text-muted-foreground text-sm font-medium",
  tagBadge: "text-xs font-bold",
} as const;

interface ArticlePageViewProps {
  loading: boolean;
  notFound: boolean;
  error: string | null;
  article: ArticleData | null;
}

/** Presentational shell for the standalone article page render states. */
export function ArticlePageView({
  loading,
  notFound,
  error,
  article,
}: ArticlePageViewProps): React.JSX.Element {
  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-muted-foreground">Loading article...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--adw-page-brown-bg) p-4">
        <h1 className="text-3xl font-semibold">Article not found</h1>
        <Link to="/articles" className="text-primary underline">
          Back to articles
        </Link>
      </main>
    );
  }

  if (error !== null || article === null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-destructive">{error ?? "Something went wrong"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 bg-(--adw-page-brown-bg) p-4 sm:p-6 lg:p-8">
      <article className={ARTICLE_PAGE_TYPOGRAPHY_CLASSES.mainMeasure}>
        <header className="mb-8">
          <h1 className={ARTICLE_PAGE_TYPOGRAPHY_CLASSES.title}>{article.title}</h1>
          <p className={ARTICLE_PAGE_TYPOGRAPHY_CLASSES.description}>{article.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <time className={ARTICLE_PAGE_TYPOGRAPHY_CLASSES.metaTime}>
              {new Date(article.date).toLocaleDateString()}
            </time>
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className={ARTICLE_PAGE_TYPOGRAPHY_CLASSES.tagBadge}>
                {tag}
              </Badge>
            ))}
          </div>
        </header>
        <ErrorBoundary>
          <MarkdownRenderer content={article.body} />
        </ErrorBoundary>
      </article>
    </main>
  );
}

export function ArticlePage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const contentSlug = slug;

    let cancelled = false;

    async function fetchArticle(): Promise<void> {
      try {
        const data = await fetchArticleBySlug(contentSlug);
        if (!cancelled) {
          setArticle(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            let message = "Failed to load article";
            if (err instanceof ApiError) {
              message = err.message;
            }
            setError(message);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchArticle();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <ArticlePageView
      loading={loading}
      notFound={notFound}
      error={error}
      article={article}
    />
  );
}