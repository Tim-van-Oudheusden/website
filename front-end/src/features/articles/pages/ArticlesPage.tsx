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

export interface ArticleTableOfContentsItem {
  id: string;
  text: string;
  depth: 1 | 2 | 3;
}

export const ARTICLES_PAGE_LAYOUT_CLASSES = {
  container: "flex w-full min-h-0 flex-1 flex-col bg-[var(--adw-page-brown-bg)] md:flex-row",
  sidebar: "w-full min-h-0 overflow-y-auto bg-[var(--adw-page-brown-bg)] md:sticky md:top-[4.2rem] md:h-[calc(100dvh-4.2rem)] md:basis-[clamp(13rem,15vw,18rem)] md:min-w-[13rem] md:shrink-0",
  divider: "hidden w-[0.5px] bg-[var(--adw-light-5)] dark:bg-[var(--adw-dark-1)] md:block",
  content: "bg-[var(--adw-page-brown-bg)] min-h-[20rem] min-w-0 flex-1 p-4 sm:p-6 lg:p-8",
  contentWithToc: "mx-auto w-full max-w-[120rem] md:pr-[clamp(13rem,19vw,17rem)]",
  toc: "hidden md:block md:fixed md:right-6 lg:right-8 md:top-[5.25rem] md:w-[clamp(12rem,17vw,15.5rem)] md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto",
} as const;

export const ARTICLES_PAGE_TYPOGRAPHY_CLASSES = {
  pageTitle: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  sidebarTriggerLabel: "truncate font-medium",
  sidebarArticleButton: "hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-base font-medium transition-colors [&>svg]:size-4 [&>svg]:shrink-0",
  articleTitle: "text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight",
  articleDescription: "text-muted-foreground mt-2 max-w-[65ch] text-base sm:text-lg leading-relaxed",
  articleBodyMeasure: "mx-auto w-full max-w-[75ch]",
  articleTagBadge: "bg-[var(--adw-brown-1)] text-[var(--adw-dark-4)] [a&]:hover:bg-[var(--adw-brown-1)]/90",
  tocTitle: "text-sm font-semibold tracking-tight",
  tocLink: "text-muted-foreground block text-sm leading-relaxed hover:text-foreground transition-colors",
} as const;

interface ArticleLocationTrailProps {
  articleTitle: string;
  onArticlesActivate: () => void;
}

interface TocNavigationDependencies {
  getElementById: (id: string) => { scrollIntoView: (options?: ScrollIntoViewOptions) => void; } | null;
  getCurrentPathWithQuery: () => string;
  replaceUrl: (url: string) => void;
}

const DEFAULT_TOC_NAVIGATION_DEPENDENCIES: TocNavigationDependencies = {
  getElementById: (id) => document.getElementById(id),
  getCurrentPathWithQuery: () => `${window.location.pathname}${window.location.search}`,
  replaceUrl: (url) => { window.history.replaceState(null, "", url); },
};

function sanitizeHeadingText(rawText: string): string {
  return rawText
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/<\/?[^>]+>/g, "")
    .trim();
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractArticleTableOfContents(markdownBody: string): ArticleTableOfContentsItem[] {
  const headingMatches = markdownBody.matchAll(/^(#{1,3})\s+(.+?)\s*$/gm);
  const slugCounts = new Map<string, number>();
  const toc: ArticleTableOfContentsItem[] = [];

  for (const [, hashes, rawHeadingText] of headingMatches) {
    const text = sanitizeHeadingText(rawHeadingText);
    if (text.length === 0) {
      continue;
    }

    const baseSlug = slugifyHeading(text);
    if (baseSlug.length === 0) {
      continue;
    }

    const currentCount = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, currentCount + 1);
    const id = currentCount === 0 ? baseSlug : `${baseSlug}-${currentCount}`;

    toc.push({
      id,
      text,
      depth: hashes.length as 1 | 2 | 3,
    });
  }

  return toc;
}

export function resolveArticlesTrailTargetSlug(articles: ArticleSummary[]): string | null {
  return getDefaultArticleSlug(articles);
}

export function navigateToArticleHeadingById(
  headingId: string,
  dependencies: TocNavigationDependencies = DEFAULT_TOC_NAVIGATION_DEPENDENCIES,
): boolean {
  const targetHeading = dependencies.getElementById(headingId);
  if (targetHeading == null) {
    return false;
  }

  targetHeading.scrollIntoView({ behavior: "smooth", block: "start" });
  dependencies.replaceUrl(`${dependencies.getCurrentPathWithQuery()}#${headingId}`);
  return true;
}

function resolveTocLinkIndentClass(depth: 1 | 2 | 3): string {
  if (depth === 3) {
    return "pl-3";
  }

  return "";
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
        className="cursor-pointer font-medium hover:text-foreground transition-colors"
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

  useEffect(() => {
    if (selectedArticle == null) {
      return;
    }

    const hash = window.location.hash;
    if (hash.length <= 1) {
      return;
    }

    const headingId = decodeURIComponent(hash.slice(1));
    const frameId = window.requestAnimationFrame(() => {
      navigateToArticleHeadingById(headingId);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedArticle]);

  if (loadingArticles) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--adw-page-brown-bg)] p-4">
        <p className="text-muted-foreground">Loading articles...</p>
      </main>
    );
  }

  if (listError !== null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--adw-page-brown-bg)] p-4">
        <p className="text-destructive">{listError}</p>
      </main>
    );
  }

  if (articles.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--adw-page-brown-bg)] p-4">
        <h1 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle}>Articles</h1>
        <p className="text-muted-foreground">No articles yet.</p>
      </main>
    );
  }

  const groupedArticles = groupArticlesByCategory(articles);
  const trailTargetSlug = resolveArticlesTrailTargetSlug(articles);
  const articleTableOfContents = selectedArticle == null
    ? []
    : extractArticleTableOfContents(selectedArticle.body);

  return (
    <main className={ARTICLES_PAGE_LAYOUT_CLASSES.container}>
      <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.sidebar}>
        <div className="p-3">
          <h1 className={cn("px-2 pb-2", ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle)}>Articles</h1>
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
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2 text-base font-medium">
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          chevronRotationClass,
                        )}
                      />
                      <Folder className="size-4" />
                      <span className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarTriggerLabel}>{category}</span>
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
                            ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton,
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
            <div className={ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc}>
              <div className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure}>
                <header className="mb-8">
                  <h2 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTitle}>{selectedArticle.title}</h2>
                  <p className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription}>{selectedArticle.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <time className="text-muted-foreground text-sm font-medium">
                      {new Date(selectedArticle.date).toLocaleDateString()}
                    </time>
                    {selectedArticle.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className={cn("text-xs", ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge)}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </header>
                <ErrorBoundary>
                  <MarkdownRenderer content={selectedArticle.body} />
                </ErrorBoundary>
              </div>

              {articleTableOfContents.length > 0 && (
                <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.toc}>
                  <nav
                    aria-label="Table of contents"
                    className="border-border bg-background/70 rounded-lg border px-4 py-3"
                  >
                    <h3 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocTitle}>On this page</h3>
                    <ol className="mt-3 space-y-2">
                      {articleTableOfContents.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            onClick={(event) => {
                              if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
                                return;
                              }

                              event.preventDefault();
                              navigateToArticleHeadingById(item.id);
                            }}
                            className={cn(
                              ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLink,
                              resolveTocLinkIndentClass(item.depth),
                            )}
                          >
                            {item.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </aside>
              )}
            </div>
          </>
        )}
      </article>
    </main>
  );
}
