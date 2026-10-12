import { cn } from "cn";
import type { JSX } from "react";
import { useRef } from "react";

import type { ArticleData } from "shared/articles";
import { resolveSocialImagePath } from "shared/social-image";

import { ErrorBoundary, renderErrorFallback } from "@/shared/components/error-boundary";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { Badge } from "@/shared/components/ui/badge";

import { useArticleMotion } from "../hooks/use-article-motion";
import type { UseArticleTocResult } from "../hooks/use-article-toc";
import { formatArticleDate } from "../lib/article-date";
import { estimateReadingMinutes } from "../lib/article-reading-time";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_MOTION_CLASSES,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../lib/articles-page-styles";

import { ArticleLocationTrail } from "./article-location-trail";
import { ArticleInlineToc, ArticleTocNav } from "./article-toc-nav";

interface ArticleContentProps {
  article: ArticleData | null;
  loading: boolean;
  error: string | null;
  toc: UseArticleTocResult;
  onArticlesActivate: () => void;
}

interface ArticleBodyProps {
  article: ArticleData;
  toc: UseArticleTocResult;
}

/** Title block, cover, and body of one article; mounted per article so its motion starts fresh. */
function ArticleBody({ article, toc }: ArticleBodyProps): JSX.Element {
  const proseContainerRef = useRef<HTMLDivElement>(null);
  const motion = useArticleMotion(proseContainerRef);
  const coverPath = resolveSocialImagePath(article.socialImage);

  return (
    <div className={cn(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure, motion.pageEnter && ARTICLES_PAGE_MOTION_CLASSES.pageEnter)}>
      <header className="mb-10">
        <p className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleEyebrow}>{article.category}</p>
        <h1 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTitle}>{article.title}</h1>
        <p className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleDescription}>{article.description}</p>
        <div className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleMeta}>
          <time dateTime={article.date}>{formatArticleDate(article.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{`${String(estimateReadingMinutes(article.body))} min read`}</span>
          {article.tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-2 sm:ml-auto">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className={cn("text-xs", ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge)}>
                    {tag}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      {coverPath !== null && (
        <div className={ARTICLES_PAGE_LAYOUT_CLASSES.cover}>
          <img src={coverPath} alt="" className="size-full object-cover" />
        </div>
      )}
      {toc.tocItems.length > 0 && <ArticleInlineToc {...toc} />}
      <div
        ref={proseContainerRef}
        className={cn(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleProse, ARTICLES_PAGE_MOTION_CLASSES.revealBlocks)}
      >
        <ErrorBoundary fallback={renderErrorFallback}>
          <MarkdownRenderer content={article.body} headingLevelOffset={1} />
        </ErrorBoundary>
      </div>
    </div>
  );
}

/** Selected-article column: location trail, header, body, and right TOC. */
export function ArticleContent({
  article,
  loading,
  error,
  toc,
  onArticlesActivate,
}: ArticleContentProps): JSX.Element {
  return (
    <article className={ARTICLES_PAGE_LAYOUT_CLASSES.content}>
      {(loading || error !== null) && (
        // No article title yet: keep one h1 naming the page.
        <h1 className="sr-only">Articles</h1>
      )}
      {loading && (
        <p className="text-muted-foreground">Loading article...</p>
      )}
      {!loading && error !== null && (
        <p className="text-destructive">{error}</p>
      )}
      {!loading && error === null && article !== null && (
        <div className={ARTICLES_PAGE_LAYOUT_CLASSES.contentWithToc}>
          <div className={ARTICLES_PAGE_LAYOUT_CLASSES.locationTrailAlign}>
            <ArticleLocationTrail
              articleTitle={article.title}
              onArticlesActivate={onArticlesActivate}
            />
          </div>
          <ArticleBody key={article.slug} article={article} toc={toc} />

          {toc.tocItems.length > 0 && <ArticleTocNav {...toc} />}
        </div>
      )}
    </article>
  );
}
