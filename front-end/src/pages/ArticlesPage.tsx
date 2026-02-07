import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ROUTES, type ContentFrontmatter } from "shared";
import { apiGet, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ArticlesPage(): React.JSX.Element {
  const [articles, setArticles] = useState<ContentFrontmatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticles(): Promise<void> {
      try {
        const data = await apiGet<ContentFrontmatter[]>(ROUTES.CONTENT);
        if (!cancelled) {
          setArticles(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load articles");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchArticles();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Loading articles...</p>
      </main>
    );
  }

  if (error !== null) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (articles.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Articles</h1>
        <p className="text-muted-foreground">No articles yet.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">Articles</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link key={article.slug} to={`/articles/${article.slug}`} className="group">
            <Card className="transition-colors group-hover:border-primary">
              <CardHeader>
                <CardTitle>{article.title}</CardTitle>
                <CardDescription>{article.description}</CardDescription>
                <div className="flex flex-wrap gap-1 pt-2">
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground pt-1 text-xs">
                  {new Date(article.date).toLocaleDateString()}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
