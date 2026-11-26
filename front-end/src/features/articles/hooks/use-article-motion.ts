import { useState } from "react";

import type { ArticleMotion } from "../lib/article-motion";
import { resolveArticleMotion } from "../lib/article-motion";

const NO_MOTION: ArticleMotion = { pageEnter: false };

function readArticleMotion(): ArticleMotion {
  if (typeof window === "undefined") {
    return NO_MOTION;
  }

  return resolveArticleMotion({
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    hasHashTarget: window.location.hash.length > 1,
  });
}

/** Article motion for one mounted article, decided once when it opens (mount the caller per article). */
export function useArticleMotion(): ArticleMotion {
  const [motion] = useState(readArticleMotion);

  return motion;
}
