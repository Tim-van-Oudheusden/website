/** What the browser and URL say about whether the article page may animate. */
export interface ArticleMotionEnvironment {
  prefersReducedMotion: boolean;
  /** The URL names a heading (`#id`), so the reader must land on visible content. */
  hasHashTarget: boolean;
}

export interface ArticleMotion {
  /** Fade/slide the title block in when the article opens. */
  pageEnter: boolean;
}

/**
 * Decide which article motion runs. Reduced motion and heading deep links turn
 * it off so content is visible immediately.
 */
export function resolveArticleMotion(environment: ArticleMotionEnvironment): ArticleMotion {
  return { pageEnter: !environment.prefersReducedMotion && !environment.hasHashTarget };
}
