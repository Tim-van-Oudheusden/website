import type { RefObject } from "react";
import { useEffect, useState } from "react";

import type { CanyonMotion } from "../lib/canyon-progress";
import { resolveCanyonMotion, revealedStrata, scrollProgress } from "../lib/canyon-progress";

/** How the canyon moves, read once when the page opens; no motion without a browser. */
function readCanyonMotion(): CanyonMotion {
  return resolveCanyonMotion({
    prefersReducedMotion: typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

/** The canyon's motion for this visit (pinned and scroll-linked, or one static frame under reduced motion). */
export function useCanyonMotion(): CanyonMotion {
  const [motion] = useState(readCanyonMotion);

  return motion;
}

/**
 * Drives the canyon from scroll. One passive scroll and resize listener queue
 * at most one animation frame; each frame measures the track, writes
 * `--p` on it (the scene's CSS derives every moving part from it) and, only
 * when the count changes, re-renders with how many strata are revealed. While
 * the track is off-screen it carries `data-paused`, which stops the ambient
 * loops. Returns the revealed count; 0 while not scroll-linked.
 */
export function useCanyonProgress(
  trackRef: RefObject<HTMLElement | null>,
  strataCount: number,
  scrollLinked: boolean,
): number {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const track = trackRef.current;

    if (!scrollLinked || track === null) {
      return;
    }

    let frame: number | null = null;
    let shownProgress: string | null = null;
    let shownRevealed = -1;

    function update(): void {
      frame = null;

      if (track === null) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const progress = scrollProgress({
        trackTop: rect.top,
        trackHeight: rect.height,
        viewportHeight: window.innerHeight,
      });
      const value = progress.toFixed(4);
      const count = revealedStrata(progress, strataCount);

      if (value !== shownProgress) {
        shownProgress = value;
        track.style.setProperty("--p", value);
      }

      if (count !== shownRevealed) {
        shownRevealed = count;
        setRevealed(count);
      }
    }

    function schedule(): void {
      frame ??= window.requestAnimationFrame(update);
    }

    const visibility = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          track.removeAttribute("data-paused");
        } else {
          track.setAttribute("data-paused", "");
        }
      }
    });

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    visibility.observe(track);
    schedule();

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      visibility.disconnect();

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [trackRef, strataCount, scrollLinked]);

  return revealed;
}
