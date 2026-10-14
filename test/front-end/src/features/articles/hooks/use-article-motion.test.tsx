import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { act, useRef } from "react";

import { useArticleMotion } from "../../../../../../front-end/src/features/articles/hooks/use-article-motion";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findAllBySlot, findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeDocument, FakeElement, FakeIntersection } from "../../../../src/test/fake-dom";
import { triggerFakeIntersections, triggerWindowEvent, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

afterEach(() => {
  window.location.hash = "";
});

const BLOCK_COUNT = 3;
// The fake window's innerHeight; rootBounds-less readings fall back to it.
const VIEWPORT_HEIGHT = 800;

/** Mirrors ArticleContent: the ref'd container's first element is the prose root, whose children are the blocks. */
function MotionProbe({ blocks }: { blocks: number }): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const motion = useArticleMotion(containerRef);

  return (
    <div>
      <output data-slot="page-enter">{String(motion.pageEnter)}</output>
      <output data-slot="scroll-reveal">{String(motion.scrollReveal)}</output>
      <div ref={containerRef}>
        {blocks > 0 && (
          <div>
            {Array.from({ length: blocks }, (_, index) => (
              <p key={index} data-slot="block">{`Block ${index}`}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function mountProbe(blocks = BLOCK_COUNT): FakeMount {
  return mountIntoBody(<MotionProbe blocks={blocks} />);
}

function blocksOf(mount: FakeMount): FakeElement[] {
  return findAllBySlot(mount.container, "block");
}

function motionOf(mount: FakeMount): { pageEnter: string; scrollReveal: string } {
  return {
    pageEnter: findBySlot(mount.container, "page-enter").textContent,
    scrollReveal: findBySlot(mount.container, "scroll-reveal").textContent,
  };
}

function revealStates(mount: FakeMount): (string | null)[] {
  return blocksOf(mount).map((block) => block.getAttribute("data-reveal"));
}

/** A reading of `target` whose top edge sits at `top`, inside a viewport of `VIEWPORT_HEIGHT`. */
function reading(target: FakeElement, top: number, intersectionRatio = 0): FakeIntersection {
  return { target, intersectionRatio, boundingClientRect: { top }, rootBounds: { height: VIEWPORT_HEIGHT } };
}

function report(intersections: FakeIntersection[]): void {
  act(() => {
    triggerFakeIntersections(intersections);
  });
}

/** Hold every block of `mount` back below the fold. */
function holdAll(mount: FakeMount): void {
  report(blocksOf(mount).map((block) => reading(block, VIEWPORT_HEIGHT + 400)));
}

/**
 * A link element whose `closest` answers the hook's in-page-link selector the
 * way a real element does (the fake's `closest` never matches).
 */
function link(href: string): FakeElement {
  const anchor = (document as unknown as FakeDocument).createElement("a");

  anchor.setAttribute("href", href);

  Object.defineProperty(anchor, "closest", {
    value: (selector: string) => (selector === "a[href^='#']" && href.startsWith("#") ? anchor : null),
  });

  return anchor;
}

function clickOn(target: unknown): void {
  act(() => {
    (document as unknown as FakeDocument).dispatchEvent({ type: "click", target } as { type: string });
  });
}

describe("useArticleMotion", () => {
  test("enables the page enter and scroll reveals when nothing rules motion out", () => {
    const mount = mountProbe();

    try {
      expect(motionOf(mount)).toEqual({ pageEnter: "true", scrollReveal: "true" });
      expect(revealStates(mount)).toEqual([null, null, null]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("never hides a block in view on its first reading, and stops watching it", () => {
    const mount = mountProbe();
    const [first] = blocksOf(mount);

    try {
      if (first === undefined) {
        throw new Error("Expected a rendered block");
      }

      report([reading(first, 0, 1)]);
      expect(first.getAttribute("data-reveal")).toBeNull();

      // Unobserved now: a later below-the-fold reading cannot hold it back.
      report([reading(first, VIEWPORT_HEIGHT + 400)]);
      expect(first.getAttribute("data-reveal")).toBeNull();
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("holds below-the-fold blocks back and shows each one as it scrolls into view", () => {
    const mount = mountProbe();
    const [first, second, third] = blocksOf(mount);

    try {
      if (first === undefined || second === undefined || third === undefined) {
        throw new Error("Expected three rendered blocks");
      }

      report([reading(first, 100, 1), reading(second, VIEWPORT_HEIGHT + 50), reading(third, VIEWPORT_HEIGHT + 600)]);
      expect(revealStates(mount)).toEqual([null, "pending", "pending"]);

      // Still below the fold: stays held.
      report([reading(second, VIEWPORT_HEIGHT + 10)]);
      expect(revealStates(mount)).toEqual([null, "pending", "pending"]);

      report([reading(second, VIEWPORT_HEIGHT - 20, 0.1)]);
      expect(revealStates(mount)).toEqual([null, "shown", "pending"]);

      // Shown blocks are no longer watched, so they never go back to pending.
      report([reading(second, VIEWPORT_HEIGHT + 400)]);
      expect(revealStates(mount)).toEqual([null, "shown", "pending"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("reveals a held block the reader has jumped past without it ever intersecting", () => {
    const mount = mountProbe();
    const [first] = blocksOf(mount);

    try {
      if (first === undefined) {
        throw new Error("Expected a rendered block");
      }

      report([reading(first, VIEWPORT_HEIGHT + 400)]);
      expect(first.getAttribute("data-reveal")).toBe("pending");

      report([reading(first, -500)]);
      expect(first.getAttribute("data-reveal")).toBe("shown");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("measures against window.innerHeight when a reading has no rootBounds", () => {
    const mount = mountProbe();
    const [first] = blocksOf(mount);

    try {
      if (first === undefined) {
        throw new Error("Expected a rendered block");
      }

      report([{ ...reading(first, VIEWPORT_HEIGHT + 100), rootBounds: null }]);
      expect(first.getAttribute("data-reveal")).toBe("pending");

      report([{ ...reading(first, VIEWPORT_HEIGHT - 100), rootBounds: null }]);
      expect(first.getAttribute("data-reveal")).toBe("shown");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("an in-page link click drops every hold at once, without a fade, and stops watching", () => {
    const mount = mountProbe();

    try {
      holdAll(mount);
      expect(revealStates(mount)).toEqual(["pending", "pending", "pending"]);

      clickOn(link("#deep-heading"));
      expect(revealStates(mount)).toEqual([null, null, null]);

      // Disconnected: later below-the-fold readings hold nothing back again.
      holdAll(mount);
      expect(revealStates(mount)).toEqual([null, null, null]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("clicks on other links or on non-elements leave the holds in place", () => {
    const mount = mountProbe();

    try {
      holdAll(mount);

      clickOn(link("/articles/other"));
      clickOn((document as unknown as FakeDocument).createTextNode("#not-an-element"));
      clickOn(null);

      expect(revealStates(mount)).toEqual(["pending", "pending", "pending"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("a hash change drops every hold at once", () => {
    const mount = mountProbe();

    try {
      holdAll(mount);

      act(() => {
        triggerWindowEvent("hashchange");
      });

      expect(revealStates(mount)).toEqual([null, null, null]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("unmounting drops the holds and removes exactly the click and hashchange listeners it added", () => {
    const fakeDocument = document as unknown as Record<string, unknown>;
    const fakeWindow = window as unknown as Record<string, unknown>;
    const originals = {
      documentAdd: fakeDocument["addEventListener"],
      documentRemove: fakeDocument["removeEventListener"],
      windowAdd: fakeWindow["addEventListener"],
      windowRemove: fakeWindow["removeEventListener"],
    };
    const added: [string, unknown, unknown][] = [];
    const removed: [string, unknown, unknown][] = [];

    function record(log: [string, unknown, unknown][], scope: string, original: unknown) {
      return (type: string, listener: unknown, options?: unknown): void => {
        if (type === "click" || type === "hashchange") {
          log.push([`${scope}:${type}`, listener, options]);
        }

        (original as (type: string, listener: unknown, options?: unknown) => void)(type, listener, options);
      };
    }

    fakeDocument["addEventListener"] = record(added, "document", originals.documentAdd);
    fakeDocument["removeEventListener"] = record(removed, "document", originals.documentRemove);
    fakeWindow["addEventListener"] = record(added, "window", originals.windowAdd);
    fakeWindow["removeEventListener"] = record(removed, "window", originals.windowRemove);

    try {
      const mount = mountProbe();
      const blocks = blocksOf(mount);

      holdAll(mount);
      expect(added.map(([target]) => target)).toEqual(["document:click", "window:hashchange"]);
      // Capture phase, so the hold drops before the browser scrolls to the target.
      expect(added[0]?.[2]).toBe(true);

      unmountFakeDomRoot(mount);

      expect(removed).toEqual(added);
      expect(blocks.map((block) => block.getAttribute("data-reveal"))).toEqual([null, null, null]);
    } finally {
      fakeDocument["addEventListener"] = originals.documentAdd;
      fakeDocument["removeEventListener"] = originals.documentRemove;
      fakeWindow["addEventListener"] = originals.windowAdd;
      fakeWindow["removeEventListener"] = originals.windowRemove;
    }
  });

  test("a heading deep link turns all motion off, so nothing is ever held", () => {
    window.location.hash = "#deep-heading";
    const mount = mountProbe();

    try {
      expect(motionOf(mount)).toEqual({ pageEnter: "false", scrollReveal: "false" });

      holdAll(mount);
      expect(revealStates(mount)).toEqual([null, null, null]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("without IntersectionObserver the page still enters but nothing is held", () => {
    const fakeWindow = window as unknown as Record<string, unknown>;
    const observer = fakeWindow["IntersectionObserver"];

    fakeWindow["IntersectionObserver"] = undefined;

    try {
      const mount = mountProbe();

      try {
        expect(motionOf(mount)).toEqual({ pageEnter: "true", scrollReveal: "false" });

        holdAll(mount);
        expect(revealStates(mount)).toEqual([null, null, null]);
      } finally {
        unmountFakeDomRoot(mount);
      }
    } finally {
      fakeWindow["IntersectionObserver"] = observer;
    }
  });

  test("an article with no rendered body observes nothing and does not throw", () => {
    const mount = mountProbe(0);

    try {
      expect(motionOf(mount)).toEqual({ pageEnter: "true", scrollReveal: "true" });
      expect(blocksOf(mount)).toEqual([]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
