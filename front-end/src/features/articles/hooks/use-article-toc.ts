import { useEffect, useMemo, useState } from "react";

import type { ArticleData } from "shared/articles";

import type { ArticleTableOfContentsItem } from "../lib/article-toc";
import { extractArticleTableOfContents, resolveActiveTocHeadingIds } from "../lib/article-toc";

export interface UseArticleTocResult {
  tocItems: ArticleTableOfContentsItem[];
  visibleTocHeadingIds: string[];
}

/**
 * Derives the article's table of contents and tracks which headings are above
 * the viewport fold so the TOC can highlight the reader's position.
 */
export function useArticleToc(
  article: ArticleData | null,
  loadingArticle: boolean,
): UseArticleTocResult {
  const tocItems = useMemo(
    () => (article === null ? [] : extractArticleTableOfContents(article.body)),
    [article],
  );
  const [visibleTocHeadingIds, setVisibleTocHeadingIds] = useState<string[]>([]);
  const tracking = !loadingArticle && article !== null && tocItems.length > 0;

  // Reset during render (not in the effect) so an inactive TOC never commits stale headings.
  if (!tracking && visibleTocHeadingIds.length > 0) {
    setVisibleTocHeadingIds([]);
  }

  useEffect(() => {
    if (!tracking) {
      return;
    }

    let rafId: number | null = null;

    function updateActiveTocHeadings(): void {
      rafId = null;
      const nextVisibleHeadingIds = resolveActiveTocHeadingIds(
        tocItems,
        (headingId) => {
          const headingElement = document.getElementById(headingId);

          if (headingElement === null) {
            return null;
          }

          return headingElement.getBoundingClientRect();
        },
        window.innerHeight,
      );

      setVisibleTocHeadingIds((currentVisibleHeadingIds) => {
        if (
          currentVisibleHeadingIds.length === nextVisibleHeadingIds.length
          && currentVisibleHeadingIds.every((id, index) => id === nextVisibleHeadingIds[index])
        ) {
          return currentVisibleHeadingIds;
        }

        return nextVisibleHeadingIds;
      });
    }

    function scheduleActiveTocHeadingUpdate(): void {
      if (rafId !== null) {
        return;
      }

      rafId = window.requestAnimationFrame(updateActiveTocHeadings);
    }

    window.addEventListener("scroll", scheduleActiveTocHeadingUpdate, { passive: true });
    document.addEventListener("scroll", scheduleActiveTocHeadingUpdate, { passive: true, capture: true });
    window.addEventListener("resize", scheduleActiveTocHeadingUpdate);
    scheduleActiveTocHeadingUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleActiveTocHeadingUpdate);
      document.removeEventListener("scroll", scheduleActiveTocHeadingUpdate, true);
      window.removeEventListener("resize", scheduleActiveTocHeadingUpdate);

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [tracking, tocItems]);

  return { tocItems, visibleTocHeadingIds };
}
