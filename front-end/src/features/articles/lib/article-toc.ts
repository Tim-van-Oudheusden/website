import { extractMarkdownHeadings, TOC_MAX_DEPTH } from "@/shared/lib/markdown-headings";

export interface ArticleTableOfContentsItem {
  id: string;
  text: string;
  depth: 1 | 2 | 3;
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
    depth: heading.depth as 1 | 2 | 3,
  }));
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

export function resolveTocLinkIndentClass(depth: 1 | 2 | 3): string {
  if (depth === 3) {
    return "pl-3";
  }

  return "";
}
