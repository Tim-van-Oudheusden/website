import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ObservedSectionEntry } from "../../../../../../front-end/src/features/home/hooks/use-active-home-section";
import {
  sectionsInBand,
  selectActiveSectionId,
  useActiveHomeSection,
} from "../../../../../../front-end/src/features/home/hooks/use-active-home-section";
import type { HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeDocument, FakeElement } from "../../../../src/test/fake-dom";
import { triggerFakeIntersections, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

const VALID_IDS: readonly HomeSectionId[] = ["start", "for-you", "socials"];

function entry(id: string, isIntersecting: boolean): ObservedSectionEntry {
  return { id, isIntersecting };
}

describe("sectionsInBand", () => {
  test("adds sections that enter the band and drops those that leave it", () => {
    expect(sectionsInBand(new Set(["start"]), [entry("start", false), entry("for-you", true)])).toEqual(new Set(["for-you"]));
  });

  test("keeps sections no entry reports on", () => {
    expect(sectionsInBand(new Set(["start"]), [entry("for-you", true)])).toEqual(new Set(["start", "for-you"]));
  });

  test("applies a section's entries in order, so its latest report wins", () => {
    expect(sectionsInBand(new Set(), [entry("for-you", true), entry("for-you", false)])).toEqual(new Set());
  });
});

describe("selectActiveSectionId", () => {
  test("selects the section in the band", () => {
    expect(selectActiveSectionId(new Set(["for-you"]), VALID_IDS, "start")).toBe("for-you");
  });

  test("selects the later section in page order when two share the band", () => {
    expect(selectActiveSectionId(new Set(["socials", "start"]), VALID_IDS, "for-you")).toBe("socials");
  });

  test("ignores ids outside the valid section set", () => {
    expect(selectActiveSectionId(new Set(["start", "unknown"]), VALID_IDS, "for-you")).toBe("start");
  });

  test("keeps the current section when the band holds no section", () => {
    expect(selectActiveSectionId(new Set(), VALID_IDS, "for-you")).toBe("for-you");
  });
});

// "agentic" is tracked but never rendered, so the hook must skip its missing element.
const TRACKED_IDS: readonly HomeSectionId[] = ["start", "for-you", "agentic", "socials"];
const RENDERED_IDS: readonly HomeSectionId[] = ["start", "for-you", "socials"];

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

  test("follows the section in the activation band as intersection reports arrive", () => {
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
          { target: section("socials"), intersectionRatio: 0.4 },
        ]);
      });

      expect(activeSection(mount)).toBe("socials");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("makes the later section current when two share the band, however little of each is visible", () => {
    const mount = mountProbe();

    try {
      // A tall section shows a far smaller share of itself in the band than a short one does.
      act(() => {
        triggerFakeIntersections([
          { target: section("start"), intersectionRatio: 0.005 },
          { target: section("for-you"), intersectionRatio: 0.001 },
        ]);
      });

      expect(activeSection(mount)).toBe("for-you");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("returns to the section still in the band when the later one leaves it", () => {
    const mount = mountProbe();

    try {
      act(() => {
        triggerFakeIntersections([
          { target: section("start"), intersectionRatio: 0.01 },
          { target: section("for-you"), intersectionRatio: 0.01 },
        ]);
      });

      act(() => {
        triggerFakeIntersections([{ target: section("for-you"), intersectionRatio: 0 }]);
      });

      expect(activeSection(mount)).toBe("start");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("keeps the current section when every reported section has left the viewport", () => {
    const mount = mountProbe();

    try {
      act(() => {
        triggerFakeIntersections([{ target: section("socials"), intersectionRatio: 0.8 }]);
      });

      act(() => {
        triggerFakeIntersections([{ target: section("socials"), intersectionRatio: 0 }]);
      });

      expect(activeSection(mount)).toBe("socials");
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
          triggerFakeIntersections([{ target: section("socials"), intersectionRatio: 1 }]);
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
