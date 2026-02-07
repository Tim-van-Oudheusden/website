import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { ROUTES } from "shared";
import { apiGet, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ArticleData {
  title: string;
  description: string;
  date: string;
  tags: string[];
  slug: string;
  body: string;
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
        const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", contentSlug);
        const data = await apiGet<ArticleData>(path);
        if (!cancelled) {
          setArticle(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setError(err instanceof ApiError ? err.message : "Failed to load article");
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

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Loading article...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold">Article not found</h1>
        <Link to="/articles" className="text-primary underline">
          Back to articles
        </Link>
      </main>
    );
  }

  if (error !== null || article === null) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-destructive">{error ?? "Something went wrong"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl flex-1 p-4 sm:p-6 lg:p-8">
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="text-muted-foreground mt-2">{article.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <time className="text-muted-foreground text-sm">
              {new Date(article.date).toLocaleDateString()}
            </time>
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
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
