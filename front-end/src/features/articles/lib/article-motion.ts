/** What the browser and URL say about whether the article page may animate. */
export interface ArticleMotionEnvironment {
  prefersReducedMotion: boolean;
  supportsIntersectionObserver: boolean;
  /** The URL names a heading (`#id`), so the reader must land on visible content. */
  hasHashTarget: boolean;
}

export interface ArticleMotion {
  /** Fade/slide the title block in when the article opens. */
  pageEnter: boolean;
  /** Hold below-the-fold body blocks and fade them in as they scroll into view. */
  scrollReveal: boolean;
}

/**
 * Decide which article motion runs. Reduced motion and heading deep links turn
 * everything off so content is visible immediately; scroll reveals also need
 * IntersectionObserver, without which nothing is ever held back.
 */
export function resolveArticleMotion(environment: ArticleMotionEnvironment): ArticleMotion {
  if (environment.prefersReducedMotion || environment.hasHashTarget) {
    return { pageEnter: false, scrollReveal: false };
  }

  return { pageEnter: true, scrollReveal: environment.supportsIntersectionObserver };
}

/** A body block's reveal state: not yet measured, or held back (hidden) below the fold. */
export type RevealPhase = "unobserved" | "pending";

/** One IntersectionObserver reading for a block. */
export interface RevealObservation {
  isIntersecting: boolean;
  /** `boundingClientRect.top` of the block. */
  top: number;
  viewportHeight: number;
}

/**
 * Next step for a block: `visible` (never hidden, stop watching), `pending`
 * (keep it held back), or `reveal` (fade it in, stop watching).
 *
 * Only blocks that start below the fold are ever held back, so content in view
 * on load is never hidden. A held block is revealed as soon as any part of it
 * enters the viewport, or once the reader has jumped past it.
 */
export function resolveRevealStep(
  phase: RevealPhase,
  observation: RevealObservation,
): "visible" | "pending" | "reveal" {
  const reached = observation.isIntersecting || observation.top < observation.viewportHeight;

  if (phase === "unobserved") {
    return reached ? "visible" : "pending";
  }

  return reached ? "reveal" : "pending";
}
