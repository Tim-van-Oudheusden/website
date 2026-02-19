import * as React from "react";
import { useState, useEffect } from "react";
import { ChevronRight, FileText, Folder, House } from "lucide-react";
import { Link } from "react-router";
import { ARTICLE_CATEGORIES, ROUTES, type ArticleCategory } from "shared";
import { apiGet, ApiError } from "@/shared/lib/api";
import { Badge } from "@/shared/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Button } from "@/shared/components/ui/button";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { MarkdownRenderer } from "@/shared/components/MarkdownRenderer";
import { cn } from "@/shared/lib/utils";
import {
  getDefaultArticleSlug,
  groupArticlesByCategory,
  type ArticleSummary,
} from "../articles-sidebar";

interface ArticleData extends ArticleSummary {
  body: string;
}

export const ARTICLES_PAGE_LAYOUT_CLASSES = {
  container: "flex w-full min-h-0 flex-1 flex-col md:flex-row",
  sidebar: "w-full min-h-0 overflow-y-auto bg-muted dark:bg-card md:sticky md:top-[4.2rem] md:h-[calc(100dvh-4.2rem)] md:basis-[clamp(13rem,15vw,18rem)] md:min-w-[13rem] md:shrink-0",
  divider: "hidden w-[0.5px] bg-[var(--adw-light-5)] dark:bg-[var(--adw-dark-1)] md:block",
  content: "bg-muted dark:bg-card min-h-[20rem] min-w-0 flex-1 p-4 sm:p-6 lg:p-8",
} as const;

interface ArticleLocationTrailProps {
  articleTitle: string;
  onArticlesActivate: () => void;
}

export function resolveArticlesTrailTargetSlug(articles: ArticleSummary[]): string | null {
  return getDefaultArticleSlug(articles);
}

export function ArticleLocationTrail({ articleTitle, onArticlesActivate }: ArticleLocationTrailProps): React.JSX.Element {
  return (
    <nav
      aria-label="Current location"
      className="text-muted-foreground mb-4 flex items-center gap-2 text-sm"
    >
      <Link to="/" aria-label="Home">
        <House className="size-4" />
      </Link>
      <span aria-hidden="true">&gt;</span>
      <button
        type="button"
        onClick={onArticlesActivate}
        className="cursor-pointer hover:text-foreground transition-colors"
      >
        Articles
      </button>
      <span aria-hidden="true">&gt;</span>
      <span className="text-foreground truncate font-medium">{articleTitle}</span>
    </nav>
  );
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
  const trailTargetSlug = resolveArticlesTrailTargetSlug(articles);

  return (
    <main className={ARTICLES_PAGE_LAYOUT_CLASSES.container}>
      <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.sidebar}>
        <div className="p-3">
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

      <div className={ARTICLES_PAGE_LAYOUT_CLASSES.divider} />

      <article className={ARTICLES_PAGE_LAYOUT_CLASSES.content}>
        {loadingArticle && (
          <p className="text-muted-foreground">Loading article...</p>
        )}
        {!loadingArticle && articleError !== null && (
          <p className="text-destructive">{articleError}</p>
        )}
        {!loadingArticle && articleError === null && selectedArticle !== null && (
          <>
            <ArticleLocationTrail
              articleTitle={selectedArticle.title}
              onArticlesActivate={() => {
                if (trailTargetSlug !== null) {
                  setSelectedSlug(trailTargetSlug);
                }
              }}
            />
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
