import { describe, expect, test } from "bun:test";

import {
  resolveCanyonMotion,
  revealedStrata,
  scrollProgress,
} from "../../../../../../front-end/src/features/agentic/lib/canyon-progress";

const VIEWPORT = 800;
const TRACK = 4800;
const SCROLLABLE = TRACK - VIEWPORT;

describe("scrollProgress", () => {
  test("is 0 while the track top is below the viewport top", () => {
    expect(scrollProgress({ trackTop: 300, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(0);
  });

  test("is 0 when the track top sits exactly at the viewport top", () => {
    expect(scrollProgress({ trackTop: 0, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(0);
  });

  test("grows linearly while the track scrolls past", () => {
    expect(scrollProgress({ trackTop: -SCROLLABLE / 4, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(0.25);
    expect(scrollProgress({ trackTop: -SCROLLABLE / 2, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(0.5);
  });

  test("is 1 once the track's end has reached the viewport bottom", () => {
    expect(scrollProgress({ trackTop: -SCROLLABLE, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(1);
  });

  test("stays 1 after the track has scrolled out of view", () => {
    expect(scrollProgress({ trackTop: -TRACK * 2, trackHeight: TRACK, viewportHeight: VIEWPORT })).toBe(1);
  });

  test("a track no taller than the viewport is 0 before it is reached and 1 once reached", () => {
    expect(scrollProgress({ trackTop: 10, trackHeight: VIEWPORT, viewportHeight: VIEWPORT })).toBe(0);
    expect(scrollProgress({ trackTop: 0, trackHeight: VIEWPORT, viewportHeight: VIEWPORT })).toBe(1);
    expect(scrollProgress({ trackTop: -5, trackHeight: 400, viewportHeight: VIEWPORT })).toBe(1);
  });
});

describe("revealedStrata", () => {
  const COUNT = 6;

  test("reveals nothing at the rim", () => {
    expect(revealedStrata(0, COUNT)).toBe(0);
  });

  test("reveals each stratum exactly at its threshold, not just below it", () => {
    for (let index = 0; index < COUNT; index += 1) {
      const threshold = (index + 0.5) / COUNT;

      expect(revealedStrata(threshold - 1e-9, COUNT)).toBe(index);
      expect(revealedStrata(threshold, COUNT)).toBe(index + 1);
    }
  });

  test("reveals every stratum at the bottom", () => {
    expect(revealedStrata(1, COUNT)).toBe(COUNT);
  });

  test("clamps progress outside 0..1", () => {
    expect(revealedStrata(-0.5, COUNT)).toBe(0);
    expect(revealedStrata(1.5, COUNT)).toBe(COUNT);
  });
});

describe("resolveCanyonMotion", () => {
  test("pins the scene, links it to scroll and plays ambient loops when motion is welcome", () => {
    expect(resolveCanyonMotion({ prefersReducedMotion: false }))
      .toEqual({ sticky: true, scrollLinked: true, ambient: true, staticProgress: null });
  });

  test("shows one static mid-descent frame when the reader prefers reduced motion", () => {
    expect(resolveCanyonMotion({ prefersReducedMotion: true }))
      .toEqual({ sticky: false, scrollLinked: false, ambient: false, staticProgress: 0.5 });
  });
});
