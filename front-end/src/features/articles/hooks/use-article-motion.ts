import type { RefObject } from "react";
import { useEffect, useState } from "react";

import type { ArticleMotion, RevealPhase } from "../lib/article-motion";
import { resolveArticleMotion, resolveRevealStep } from "../lib/article-motion";

const NO_MOTION: ArticleMotion = { pageEnter: false, scrollReveal: false };

function readArticleMotion(): ArticleMotion {
  if (typeof window === "undefined") {
    return NO_MOTION;
  }

  return resolveArticleMotion({
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    supportsIntersectionObserver: typeof window.IntersectionObserver === "function",
    hasHashTarget: window.location.hash.length > 1,
  });
}

/**
 * Article motion for one mounted article, decided once when it opens (mount
 * the caller per article). While `scrollReveal` is on, the blocks of the
 * rendered markdown (children of the prose root, the first element inside
 * `containerRef`) fade in as they scroll into view.
 */
export function useArticleMotion(containerRef: RefObject<HTMLElement | null>): ArticleMotion {
  const [motion] = useState(readArticleMotion);
  const { scrollReveal } = motion;

  useEffect(() => {
    const proseRoot = containerRef.current?.firstElementChild ?? null;

    if (!scrollReveal || proseRoot === null) {
      return;
    }

    const blocks = Array.from(proseRoot.children);
    const pendingBlocks = new Set<Element>();
    // Only below-the-fold blocks are ever held back, and the first reading
    // arrives after they have been laid out off screen, so nothing visible
    // disappears. `rootMargin` stays 0: the last block must reveal even when
    // the page cannot scroll any further.
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const phase: RevealPhase = pendingBlocks.has(entry.target) ? "pending" : "unobserved";
        const step = resolveRevealStep(phase, {
          isIntersecting: entry.isIntersecting,
          top: entry.boundingClientRect.top,
          viewportHeight: entry.rootBounds?.height ?? window.innerHeight,
        });

        if (step === "pending") {
          pendingBlocks.add(entry.target);
          entry.target.setAttribute("data-reveal", "pending");

          continue;
        }

        observer.unobserve(entry.target);
        pendingBlocks.delete(entry.target);

        if (step === "reveal") {
          entry.target.setAttribute("data-reveal", "shown");
        }
      }
    });

    // In-page jumps (TOC and heading links, hash changes) must land on visible
    // content: drop every hold at once, without a fade.
    function revealAll(): void {
      observer.disconnect();

      for (const block of pendingBlocks) {
        block.removeAttribute("data-reveal");
      }

      pendingBlocks.clear();
    }

    function revealBeforeInPageJump(event: MouseEvent): void {
      if (event.target instanceof Element && event.target.closest("a[href^='#']") !== null) {
        revealAll();
      }
    }

    for (const block of blocks) {
      observer.observe(block);
    }

    document.addEventListener("click", revealBeforeInPageJump, true);
    window.addEventListener("hashchange", revealAll);

    return () => {
      document.removeEventListener("click", revealBeforeInPageJump, true);
      window.removeEventListener("hashchange", revealAll);
      revealAll();
    };
  }, [containerRef, scrollReveal]);

  return motion;
}
