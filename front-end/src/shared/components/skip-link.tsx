import type { JSX } from "react";

/** Id of the `<main>` landmark every page renders; the skip link jumps here. */
export const MAIN_CONTENT_ID = "main-content";

/** Visually hidden until focused, so keyboard users can bypass the top bar (WCAG 2.4.1). */
export function SkipLink(): JSX.Element {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to content
    </a>
  );
}
