import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { JSX } from "react";
import { useMemo } from "react";

import type { ArticleTableOfContentsItem } from "../lib/article-toc";
import { resolveTocLinkIndentClass } from "../lib/article-toc";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TEXT,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../lib/articles-page-styles";

interface ArticleTocNavProps {
  tocItems: ArticleTableOfContentsItem[];
  visibleTocHeadingIds: string[];
  currentTocHeadingId: string | null;
}

/**
 * Headings the reader has reached are active; the section being read is the
 * current location, marked with `aria-current` and a rail bar that eases
 * between items.
 */
function TocList({ tocItems, visibleTocHeadingIds, currentTocHeadingId }: ArticleTocNavProps): JSX.Element {
  const visibleTocHeadingIdSet = useMemo(
    () => new Set(visibleTocHeadingIds),
    [visibleTocHeadingIds],
  );

  return (
    <ol className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocList}>
      {tocItems.map((item) => {
        const isCurrent = item.id === currentTocHeadingId;

        return (
          <li
            key={item.id}
            className={cn(
              ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocItem,
              isCurrent
                ? ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocItemCurrent
                : ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocItemIdle,
            )}
          >
            <a
              href={`#${item.id}`}
              className={cn(
                ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLink,
                visibleTocHeadingIdSet.has(item.id)
                  ? ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkActive
                  : ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocLinkInactive,
                resolveTocLinkIndentClass(item.depth),
              )}
              aria-current={isCurrent ? "location" : undefined}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/** Right-anchored table of contents (from `xl`), highlighting headings above the fold. */
export function ArticleTocNav(props: ArticleTocNavProps): JSX.Element {
  return (
    <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.toc}>
      <nav
        aria-label="Table of contents"
        className={ARTICLES_PAGE_LAYOUT_CLASSES.panelBox}
      >
        <h3 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.tocTitle}>{ARTICLES_PAGE_TEXT.tocHeading}</h3>
        <TocList {...props} />
      </nav>
    </aside>
  );
}

/** Collapsible table of contents above the body, below `xl` where the right rail is hidden. */
export function ArticleInlineToc(props: ArticleTocNavProps): JSX.Element {
  return (
    <details className={cn("group", ARTICLES_PAGE_LAYOUT_CLASSES.inlineToc, ARTICLES_PAGE_LAYOUT_CLASSES.panelBox)}>
      <summary className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.inlineTocSummary}>
        {ARTICLES_PAGE_TEXT.tocHeading}
        <ChevronDown aria-hidden="true" className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <nav aria-label="Table of contents">
        <TocList {...props} />
      </nav>
    </details>
  );
}
