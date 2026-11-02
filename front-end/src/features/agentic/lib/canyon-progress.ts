/** One measurement of the canyon's scroll track against the viewport. */
export interface CanyonTrackMeasure {
  /** `getBoundingClientRect().top` of the track. */
  trackTop: number;
  trackHeight: number;
  viewportHeight: number;
}

/**
 * How far the reader has descended the canyon, from 0 to 1. It is 0 while the
 * track's top is at or below the viewport top, 1 once the track has scrolled
 * `trackHeight - viewportHeight` past it, and linear in between. A track no
 * taller than the viewport has nothing to scroll through, so it jumps to 1 as
 * soon as it is reached.
 */
export function scrollProgress(measure: CanyonTrackMeasure): number {
  const scrollable = measure.trackHeight - measure.viewportHeight;

  if (scrollable <= 0) {
    return measure.trackTop <= 0 ? 1 : 0;
  }

  return Math.min(1, Math.max(0, -measure.trackTop / scrollable));
}

/**
 * How many strata, counted from the rim, are revealed at progress `progress`.
 * Stratum `i` of `count` appears once progress reaches `(i + 0.5) / count`, the
 * middle of its slice of the descent. Progress outside 0..1 is clamped.
 */
export function revealedStrata(progress: number, count: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  let revealed = 0;

  // Compare against each threshold directly so a boundary value is never lost to rounding.
  while (revealed < count && clamped >= (revealed + 0.5) / count) {
    revealed += 1;
  }

  return revealed;
}

/** What the browser says about whether the canyon may animate. */
export interface CanyonMotionEnvironment {
  prefersReducedMotion: boolean;
}

export interface CanyonMotion {
  /** Pin the canyon scene while the reader scrolls through its track. */
  sticky: boolean;
  /** Drive the descent from scroll progress. */
  scrollLinked: boolean;
  /** Play the ambient loops. */
  ambient: boolean;
  /** A fixed progress to render instead of following scroll, or `null` when scroll-linked. */
  staticProgress: number | null;
}

/**
 * Decide how the canyon moves. Reduced motion turns every animation off and
 * shows one static frame at mid-descent; otherwise the scene is pinned,
 * scroll-linked and alive.
 */
export function resolveCanyonMotion(environment: CanyonMotionEnvironment): CanyonMotion {
  if (environment.prefersReducedMotion) {
    return { sticky: false, scrollLinked: false, ambient: false, staticProgress: 0.5 };
  }

  return { sticky: true, scrollLinked: true, ambient: true, staticProgress: null };
}
