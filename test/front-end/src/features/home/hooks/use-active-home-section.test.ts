import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  selectActiveSectionId,
  useActiveHomeSection,
  type ObservedSectionEntry,
} from "../../../../../../front-end/src/features/home/hooks/use-active-home-section";
import type { HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";

import { triggerFakeIntersections, uninstallFakeDom, type FakeDocument, type FakeElement } from "../../../../src/test/fake-dom";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot, type FakeMount } from "../../../../src/test/dom-harness";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

const VALID_IDS: readonly HomeSectionId[] = ["start", "for-you", "footer"];

function entry(id: string, ratio: number, isIntersecting = true): ObservedSectionEntry {
  return { id, intersectionRatio: ratio, isIntersecting };
}

describe("selectActiveSectionId", () => {
  test("selects the highest-ratio intersecting valid section", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.2), entry("for-you", 0.8)], VALID_IDS, "start",
    )).toBe("for-you");
  });

  test("ignores non-intersecting entries", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.9, false), entry("for-you", 0.5)], VALID_IDS, "start",
    )).toBe("for-you");
  });

  test("ignores ids outside the valid section set", () => {
    expect(selectActiveSectionId(
      [entry("unknown", 1), entry("start", 0.3)], VALID_IDS, "for-you",
    )).toBe("start");
  });

  test("keeps the current section when no entry competes", () => {
    expect(selectActiveSectionId([], VALID_IDS, "for-you")).toBe("for-you");

    expect(selectActiveSectionId(
      [entry("start", 0, true)], VALID_IDS, "for-you",
    )).toBe("for-you");
  });

  test("prefers the first strictly greater ratio on ties", () => {
    expect(selectActiveSectionId(
      [entry("start", 0.5), entry("for-you", 0.5)], VALID_IDS, "footer",
    )).toBe("start");
  });
});

// "proof" is tracked but never rendered, so the hook must skip its missing element.
const TRACKED_IDS: readonly HomeSectionId[] = ["start", "for-you", "proof", "footer"];
const RENDERED_IDS: readonly HomeSectionId[] = ["start", "for-you", "footer"];

function ActiveSectionProbe({ sectionIds }: { sectionIds: readonly HomeSectionId[] }): ReactElement {
  const activeSectionId = useActiveHomeSection(sectionIds);

  return createElement(
    "div",
    null,
    createElement("output", { "data-slot": "active-section" }, activeSectionId),
    ...RENDERED_IDS.map((id) => createElement("section", { key: id, id })),
  );
}

function mountProbe(): FakeMount {
  return mountIntoBody(createElement(ActiveSectionProbe, { sectionIds: TRACKED_IDS }));
}

function activeSection(mount: FakeMount): string {
  return findBySlot(mount.container, "active-section").textContent;
}

function section(id: HomeSectionId): FakeElement {
  // The fake document stands in for the real one installed as a global.
  const fakeDocument = document as unknown as FakeDocument;
  const element = fakeDocument.getElementById(id);

  if (element === null) {
    throw new Error(`Expected a rendered section with id="${id}"`);
  }

  return element;
}

describe("useActiveHomeSection", () => {
  test("starts on the first section before any intersection report", () => {
    const mount = mountProbe();

    try {
      expect(activeSection(mount)).toBe("start");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("follows the most visible section as intersection reports arrive", () => {
    const mount = mountProbe();

    try {
      act(() => {
        triggerFakeIntersections([
          { target: section("start"), intersectionRatio: 0.2 },
          { target: section("for-you"), intersectionRatio: 0.6 },
        ]);
      });

      expect(activeSection(mount)).toBe("for-you");

      act(() => {
        triggerFakeIntersections([
          { target: section("for-you"), intersectionRatio: 0 },
          { target: section("footer"), intersectionRatio: 0.4 },
        ]);
      });

      expect(activeSection(mount)).toBe("footer");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("keeps the current section when every reported section has left the viewport", () => {
    const mount = mountProbe();

    try {
      act(() => {
        triggerFakeIntersections([{ target: section("footer"), intersectionRatio: 0.8 }]);
      });

      act(() => {
        triggerFakeIntersections([{ target: section("footer"), intersectionRatio: 0 }]);
      });

      expect(activeSection(mount)).toBe("footer");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("stays on the first section in browsers without IntersectionObserver", () => {
    const originalObserver: unknown = Reflect.get(window, "IntersectionObserver");

    Reflect.deleteProperty(window, "IntersectionObserver");

    try {
      const mount = mountProbe();

      try {
        act(() => {
          triggerFakeIntersections([{ target: section("footer"), intersectionRatio: 1 }]);
        });

        expect(activeSection(mount)).toBe("start");
      } finally {
        unmountFakeDomRoot(mount);
      }
    } finally {
      Reflect.set(window, "IntersectionObserver", originalObserver);
    }
  });

  test("rejects an empty section list", () => {
    expect(() => renderToStaticMarkup(createElement(ActiveSectionProbe, { sectionIds: [] }))).toThrow(
      "useActiveHomeSection requires at least one section id",
    );
  });
});
