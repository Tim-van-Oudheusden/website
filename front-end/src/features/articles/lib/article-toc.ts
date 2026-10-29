import type { TocHeadingDepth } from "@/shared/lib/markdown-headings";
import { extractMarkdownHeadings, TOC_MAX_DEPTH } from "@/shared/lib/markdown-headings";

export interface ArticleTableOfContentsItem {
  id: string;
  text: string;
  depth: TocHeadingDepth;
}

export interface TocNavigationDependencies {
  getElementById: (id: string) => Pick<Element, "scrollIntoView"> | null;
  setHash: (headingId: string) => void;
  getScrollY: () => number;
  logNavigation: (event: TocNavigationDebugEvent) => void;
}

export interface TocNavigationDebugEvent {
  headingId: string;
  foundTarget: boolean;
  stage: "fallback-hash" | "scroll";
  scrollYBefore: number;
  scrollYAfter: number;
}

export interface TocHeadingRect {
  top: number;
}

export const DEFAULT_TOC_NAVIGATION_DEPENDENCIES: TocNavigationDependencies = {
  getElementById: (id) => document.getElementById(id),
  setHash: (headingId) => {
    window.location.hash = headingId;
  },
  getScrollY: () => window.scrollY,
  logNavigation: () => {
    // Production navigation is not logged; tests inject a recorder to observe events.
  },
};

export function extractArticleTableOfContents(markdownBody: string): ArticleTableOfContentsItem[] {
  return extractMarkdownHeadings(markdownBody, TOC_MAX_DEPTH).map((heading) => ({
    id: heading.id,
    text: heading.text,
    depth: heading.depth as TocHeadingDepth,
  }));
}

/**
 * The heading id a URL hash names, percent-decoded, or `null` for an empty
 * hash. A fragment that is not valid percent-encoding (`#100%`) is returned
 * as written: browsers keep a bare `%`, and `decodeURIComponent` would throw.
 */
export function readHeadingIdFromHash(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;

  if (fragment === "") {
    return null;
  }

  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

export function navigateToArticleHeadingById(
  headingId: string,
  dependencies: TocNavigationDependencies = DEFAULT_TOC_NAVIGATION_DEPENDENCIES,
): boolean {
  const scrollYBefore = dependencies.getScrollY();
  const targetHeading = dependencies.getElementById(headingId);

  if (targetHeading === null) {
    dependencies.setHash(headingId);

    dependencies.logNavigation({
      headingId,
      foundTarget: false,
      stage: "fallback-hash",
      scrollYBefore,
      scrollYAfter: dependencies.getScrollY(),
    });

    return false;
  }

  targetHeading.scrollIntoView({ behavior: "smooth", block: "start" });
  dependencies.setHash(headingId);

  dependencies.logNavigation({
    headingId,
    foundTarget: true,
    stage: "scroll",
    scrollYBefore,
    scrollYAfter: dependencies.getScrollY(),
  });

  return true;
}

export function resolveActiveTocHeadingIds(
  tocItems: ArticleTableOfContentsItem[],
  getHeadingRect: (headingId: string) => TocHeadingRect | null,
  viewportHeight: number,
): string[] {
  return tocItems
    .filter((heading) => {
      const rect = getHeadingRect(heading.id);

      if (rect === null) {
        return false;
      }

      return rect.top < viewportHeight;
    })
    .map((heading) => heading.id);
}

/** How far down the viewport (as a share of its height) a heading must scroll to become the section being read. */
const TOC_READING_LINE = 0.35;

/**
 * The section the reader is in: the last heading that has scrolled above the
 * reading line, or, before any has, the first heading in view. A heading that
 * only just appeared at the bottom of the viewport does not count yet.
 */
export function resolveCurrentTocHeadingId(
  tocItems: ArticleTableOfContentsItem[],
  getHeadingRect: (headingId: string) => TocHeadingRect | null,
  viewportHeight: number,
): string | null {
  let passedHeadingId: string | null = null;
  let firstVisibleHeadingId: string | null = null;

  for (const heading of tocItems) {
    const rect = getHeadingRect(heading.id);

    if (rect === null) {
      continue;
    }

    if (rect.top <= viewportHeight * TOC_READING_LINE) {
      passedHeadingId = heading.id;
    } else if (firstVisibleHeadingId === null && rect.top < viewportHeight) {
      firstVisibleHeadingId = heading.id;
    }
  }

  return passedHeadingId ?? firstVisibleHeadingId;
}

export function resolveTocLinkIndentClass(depth: TocHeadingDepth): string {
  if (depth === 3) {
    return "pl-3";
  }

  return "";
}
