import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { resolveTocLinkIndentClass, type ArticleTableOfContentsItem } from "../lib/article-toc";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TEXT,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../lib/articles-page-styles";

interface ArticleTocNavProps {
  tocItems: ArticleTableOfContentsItem[];
  visibleTocHeadingIds: string[];
}

/** Right-anchored table of contents, highlighting headings above the fold. */
export function ArticleTocNav({ tocItems, visibleTocHeadingIds }: ArticleTocNavProps): React.JSX.Element {
  const visibleTocHeadingIdSet = React.useMemo(
    () => new Set(visibleTocHeadingIds),
    [visibleTocHeadingIds],
  );

  return (
    <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.toc}>
      <nav
        aria-label="Table of contents"
        className={ARTICLES_PAGE_LAYOUT_CLASSES.panelBox}
      >
        <h3 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocTitle}>{ARTICLES_PAGE_TEXT.tocHeading}</h3>
        <ol className="mt-3 space-y-2">
          {tocItems.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLink,
                  visibleTocHeadingIdSet.has(item.id)
                    ? ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkActive
                    : ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkInactive,
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
  );
}
