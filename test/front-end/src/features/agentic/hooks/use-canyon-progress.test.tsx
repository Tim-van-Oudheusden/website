import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { JSX } from "react";
import { act, createElement, useRef } from "react";

import { useCanyonProgress } from "../../../../../../front-end/src/features/agentic/hooks/use-canyon-progress";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, triggerFakeIntersections, triggerWindowEvent, uninstallFakeDom } from "../../../../src/test/fake-dom";

/** The fake window's viewport height. */
const VIEWPORT = 800;
/** A track with 4,800 px to scroll through: six strata of 800 px. */
const TRACK = 5600;
const SCROLLABLE = TRACK - VIEWPORT;

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

interface Probe {
  mount: FakeMount;
  track: FakeElement;
  /** Every revealed count the component rendered with, in order. */
  renders: number[];
  /** Puts the track's top at `top` (negative once scrolled past the viewport top). */
  scrollTo: (top: number) => void;
}

/** Renders a track driven by the hook and records each render's revealed count. */
function mountTrack(scrollLinked: boolean): Probe {
  const renders: number[] = [];
  let trackTop = 0;

  function Track(): JSX.Element {
    const trackRef = useRef<HTMLDivElement>(null);
    const revealed = useCanyonProgress(trackRef, 6, scrollLinked);

    renders.push(revealed);

    return createElement("div", { "ref": trackRef, "data-track": "true" });
  }

  const mount = mountIntoBody(createElement(Track));
  const track = queryFakeElements(mount.container, (el) => el.getAttribute("data-track") === "true")[0];

  if (track === undefined) {
    throw new Error("The track did not render");
  }

  track.getBoundingClientRect = () => ({
    left: 0, top: trackTop, right: 1280, bottom: trackTop + TRACK, width: 1280, height: TRACK, x: 0, y: trackTop,
  });

  return {
    mount,
    track,
    renders,
    scrollTo: (top) => {
      trackTop = top;
    },
  };
}

/** Lets pending animation frames (fake: `setTimeout(0)` tasks) run, inside `act`. */
async function nextFrames(): Promise<void> {
  await act(async () => {
    const { promise, resolve } = Promise.withResolvers<undefined>();

    setTimeout(resolve, 5);
    await promise;
  });
}

describe("useCanyonProgress", () => {
  test("writes --p on the track from where the track sits, on the first frame", async () => {
    const probe = mountTrack(true);

    try {
      probe.scrollTo(-SCROLLABLE / 4);
      await nextFrames();

      expect(probe.track.style.getPropertyValue("--p")).toBe("0.2500");
      expect(VIEWPORT).toBe(window.innerHeight);
    } finally {
      unmountFakeDomRoot(probe.mount);
    }
  });

  test("follows scrolling, but re-renders only when another stratum is revealed", async () => {
    const probe = mountTrack(true);

    try {
      await nextFrames();

      for (const top of [-0.05, -0.06, -0.07, -0.1, -0.2, -0.3].map((share) => share * SCROLLABLE)) {
        probe.scrollTo(top);
        triggerWindowEvent("scroll");
        await nextFrames();
      }

      // p went 0.05 → 0.3: stratum 1 (at 1/12) and stratum 2 (at 3/12) appeared, nothing else re-rendered.
      expect(probe.track.style.getPropertyValue("--p")).toBe("0.3000");
      expect(probe.renders).toEqual([0, 1, 2]);
    } finally {
      unmountFakeDomRoot(probe.mount);
    }
  });

  test("measures again when the viewport is resized", async () => {
    const probe = mountTrack(true);

    try {
      await nextFrames();
      probe.scrollTo(-SCROLLABLE);
      triggerWindowEvent("resize");
      await nextFrames();

      expect(probe.track.style.getPropertyValue("--p")).toBe("1.0000");
      expect(probe.renders.at(-1)).toBe(6);
    } finally {
      unmountFakeDomRoot(probe.mount);
    }
  });

  test("marks the track paused while it is off-screen, so the ambient loops stop", async () => {
    const probe = mountTrack(true);

    try {
      await nextFrames();
      triggerFakeIntersections([{ target: probe.track, intersectionRatio: 0 }]);

      expect(probe.track.hasAttribute("data-paused")).toBe(true);

      triggerFakeIntersections([{ target: probe.track, intersectionRatio: 0.2 }]);

      expect(probe.track.hasAttribute("data-paused")).toBe(false);
    } finally {
      unmountFakeDomRoot(probe.mount);
    }
  });

  test("leaves the track alone when it is not scroll-linked (reduced motion)", async () => {
    const probe = mountTrack(false);

    try {
      probe.scrollTo(-SCROLLABLE / 2);
      triggerWindowEvent("scroll");
      await nextFrames();

      expect(probe.track.style.getPropertyValue("--p")).toBe("");
      expect(probe.renders).toEqual([0]);
    } finally {
      unmountFakeDomRoot(probe.mount);
    }
  });
});
