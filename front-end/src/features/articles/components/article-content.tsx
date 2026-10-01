import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import type { ArticleData } from "shared/articles";
import type { ArticleTableOfContentsItem } from "../lib/article-toc";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../lib/articles-page-styles";
import { ArticleLocationTrail } from "./article-location-trail";
import { ArticleTocNav } from "./article-toc-nav";

interface ArticleContentProps {
  article: ArticleData | null;
  loading: boolean;
  error: string | null;
  tocItems: ArticleTableOfContentsItem[];
  visibleTocHeadingIds: string[];
  onArticlesActivate: () => void;
}

/** Selected-article column: location trail, header, body, and right TOC. */
export function ArticleContent({
  article,
  loading,
  error,
  tocItems,
  visibleTocHeadingIds,
  onArticlesActivate,
}: ArticleContentProps): React.JSX.Element {
  return (
    <article className={ARTICLES_PAGE_LAYOUT_CLASSES.content}>
      {loading && (
        <p className="text-muted-foreground">Loading article...</p>
      )}
      {!loading && error !== null && (
        <p className="text-destructive">{error}</p>
      )}
      {!loading && error === null && article !== null && (
        <>
          <div className={ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc}>
            <div className={ARTICLES_PAGE_LAYOUT_CLASSES.locationTrailAlign}>
              <ArticleLocationTrail
                articleTitle={article.title}
                onArticlesActivate={onArticlesActivate}
              />
            </div>
            <div className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure}>
              <header className="mb-8">
                <h2 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTitle}>{article.title}</h2>
                <p className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription}>{article.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <time className="text-muted-foreground text-sm font-medium">
                    {new Date(article.date).toLocaleDateString()}
                  </time>
                  {article.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className={cn("text-xs", ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </header>
              <ErrorBoundary>
                <MarkdownRenderer content={article.body} />
              </ErrorBoundary>
            </div>

            {tocItems.length > 0 && (
              <ArticleTocNav
                tocItems={tocItems}
                visibleTocHeadingIds={visibleTocHeadingIds}
              />
            )}
          </div>
        </>
      )}
    </article>
  );
}