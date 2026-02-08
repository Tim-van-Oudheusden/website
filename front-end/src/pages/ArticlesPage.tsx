import * as React from "react";
import { useState, useEffect } from "react";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { ARTICLE_CATEGORIES, ROUTES, type ArticleCategory } from "shared";
import { apiGet, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { cn } from "@/lib/utils";
import {
  getDefaultArticleSlug,
  groupArticlesByCategory,
  type ArticleSummary,
} from "./articles-sidebar";

interface ArticleData extends ArticleSummary {
  body: string;
}

const INITIAL_OPEN_CATEGORIES: Record<ArticleCategory, boolean> = {
  Introduction: true,
  Linux: true,
  Work: true,
  "Personal Life": true,
};

export function ArticlesPage(): React.JSX.Element {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(null);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<ArticleCategory, boolean>>(INITIAL_OPEN_CATEGORIES);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticles(): Promise<void> {
      try {
        const data = await apiGet<ArticleSummary[]>(`${ROUTES.CONTENT}?type=article`);
        if (!cancelled) {
          const items = data.filter((item): item is ArticleSummary => typeof item.slug === "string");
          setArticles(items);
          setSelectedSlug(getDefaultArticleSlug(items));
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
    return () => { cancelled = true; };
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
        const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", contentSlug);
        const data = await apiGet<ArticleData>(path);
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
    return () => { cancelled = true; };
  }, [selectedSlug]);

  if (loadingArticles) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Loading articles...</p>
      </main>
    );
  }

  if (listError !== null) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-destructive">{listError}</p>
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

  const groupedArticles = groupArticlesByCategory(articles);

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:p-8">
      <aside className="w-full lg:max-w-sm lg:shrink-0">
        <div className="bg-card rounded-lg border p-3">
          <h1 className="px-2 pb-2 text-3xl font-bold tracking-tight">Articles</h1>
          <div className="space-y-1">
            {ARTICLE_CATEGORIES.map((category) => {
              const isOpen = openCategories[category];
              const categoryArticles = groupedArticles[category];
              let chevronRotationClass = "rotate-0";
              if (isOpen) {
                chevronRotationClass = "rotate-90";
              }

              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenCategories((current) => ({ ...current, [category]: open }));
                  }}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          chevronRotationClass,
                        )}
                      />
                      <Folder className="size-4" />
                      <span className="truncate">{category}</span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {categoryArticles.length}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1 pl-6">
                    {categoryArticles.map((article) => {
                      let articleStateClass = "text-muted-foreground";
                      if (article.slug === selectedSlug) {
                        articleStateClass = "bg-accent text-accent-foreground";
                      }

                      return (
                        <button
                          key={article.slug}
                          type="button"
                          onClick={() => { setSelectedSlug(article.slug); }}
                          className={cn(
                            "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            articleStateClass,
                          )}
                        >
                          <FileText className="size-4" />
                          <span className="truncate">{article.title}</span>
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </aside>

      <article className="bg-card min-h-[20rem] flex-1 rounded-lg border p-4 sm:p-6">
        {loadingArticle && (
          <p className="text-muted-foreground">Loading article...</p>
        )}
        {!loadingArticle && articleError !== null && (
          <p className="text-destructive">{articleError}</p>
        )}
        {!loadingArticle && articleError === null && selectedArticle !== null && (
          <>
            <header className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{selectedArticle.title}</h2>
              <p className="text-muted-foreground mt-2">{selectedArticle.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <time className="text-muted-foreground text-sm">
                  {new Date(selectedArticle.date).toLocaleDateString()}
                </time>
                {selectedArticle.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </header>
            <ErrorBoundary>
              <MarkdownRenderer content={selectedArticle.body} />
            </ErrorBoundary>
          </>
        )}
      </article>
    </main>
  );
}
