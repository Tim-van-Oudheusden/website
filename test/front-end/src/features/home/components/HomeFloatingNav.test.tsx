import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeFloatingNav } from "../../../../../../front-end/src/features/home/components/home-floating-nav";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeSectionDefinition, HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import {
  deferFakeFontsReady,
  queryFakeElements,
  triggerFakeResizeObservers,
  triggerWindowEvent,
  uninstallFakeDom,
} from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

function floatingNav(sections: readonly HomeSectionDefinition[], activeSectionId: HomeSectionId): ReactElement {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return createElement(HomeFloatingNav, { sections, activeSectionId, onAnchorActivate: () => {} });
}

function navAnchor(root: FakeElement, sectionId: HomeSectionId): FakeElement {
  const [anchor] = queryFakeElements(root, (el) => el.nodeName === "A" && el.getAttribute("href") === `#${sectionId}`);

  if (anchor === undefined) {
    throw new Error(`Expected a nav anchor to #${sectionId}`);
  }

  return anchor;
}

function renderFloatingNav(): string {
  return renderToStaticMarkup(floatingNav(HOME_SECTIONS, "start"));
}

function navList(root: FakeElement): FakeElement {
  const [list] = queryFakeElements(root, (el) => el.nodeName === "UL");

  if (list === undefined) {
    throw new Error("Expected the nav list");
  }

  return list;
}

/** The clip path of the item at `index` once `layOutNav` has run: 100px wide items, 110px apart, 12px in. */
function expectedClipPath(index: number): string {
  const left = 12 + index * 110;

  return `inset(12px ${800 - left - 100}px 12px ${left}px round 9999px)`;
}

/**
 * Lays the nav out like the browser would: a list at (100, 500) with a 1px border around an 800x64
 * padding box, and its items 100x40, 12px inside the padding box, 110px apart.
 */
function layOutNav(root: FakeElement): void {
  const list = navList(root);

  list.rect = { left: 100, top: 500, width: 802, height: 66 };
  list.clientLeft = 1;
  list.clientTop = 1;
  list.clientWidth = 800;
  list.clientHeight = 64;
  list.offsetWidth = 802;
  list.offsetHeight = 66;

  HOME_SECTIONS.forEach((section, index) => {
    navAnchor(root, section.id).rect = { left: 113 + index * 110, top: 513, width: 100, height: 40 };
  });
}

function indicatorOf(mount: FakeMount): FakeElement {
  return findBySlot(mount.container, "active-indicator");
}

function classesOf(element: FakeElement): string {
  return element.getAttribute("class") ?? "";
}

describe("HomeFloatingNav", () => {
  test("uses the discover-button black for its active indicator highlight", () => {
    const html = renderFloatingNav();

    expect(html).toContain("bg-(--ink-5)");
    expect(html).not.toContain("bg-primary");
  });

  test("uses the section well surface in dark mode to match the light scheme", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:bg-(--site-section-well-bg)");
    expect(html).not.toContain("dark:bg-(--site-page-bg)");
  });

  test("shows the recent-posts entry as what's new with the newspaper icon, linking to #whats-new", () => {
    const html = renderFloatingNav();
    const anchor = /<a[^>]*href="#whats-new"[^>]*>(.*?)<\/a>/.exec(html);

    expect(anchor?.[1]).toContain("lucide-newspaper");
    expect(anchor?.[1]?.replaceAll("&#x27;", "'")).toContain("what's new");
  });

  test("inverts the active indicator in dark mode: light fill with dark text", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:bg-(--paper-1)");
    expect(html).toContain("dark:text-(--ink-5)");
  });

  test("lists the agentic section as \"agentic\" with the bot icon, linking to #agentic", () => {
    const anchor = /<a [^>]*href="#agentic"[^>]*>[\s\S]*?<\/a>/.exec(renderFloatingNav())?.[0] ?? "";

    expect(anchor).toContain("lucide-bot");
    expect(anchor).toContain("agentic");
  });

  test("lists the experience section as \"experience\" with the briefcase icon, linking to #experience", () => {
    const anchor = /<a [^>]*href="#experience"[^>]*>[\s\S]*?<\/a>/.exec(renderFloatingNav())?.[0] ?? "";

    expect(anchor).toContain("lucide-briefcase-business");
    expect(anchor).toContain("experience");
  });

  test("lists the socials section as \"socials\" with the at-sign icon, linking to #socials", () => {
    const anchor = /<a [^>]*href="#socials"[^>]*>[\s\S]*?<\/a>/.exec(renderFloatingNav())?.[0] ?? "";

    expect(anchor).toContain("lucide-at-sign");
    expect(anchor).toContain("socials");
  });

  test("animates no layout property: width is in no transition list", () => {
    expect(renderFloatingNav()).not.toMatch(/transition-\[[^\]]*width/);
  });
});

describe("HomeFloatingNav label overlay", () => {
  test("paints every link in the inactive colours, the current one included", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      const current = navAnchor(mount.container, "start");

      expect(current.getAttribute("aria-current")).toBe("location");
      expect(classesOf(current)).toBe(classesOf(navAnchor(mount.container, "agentic")));
      expect(classesOf(current)).not.toContain("text-white");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("copies every label onto the highlight in the active colours", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      const overlay = indicatorOf(mount);

      expect(classesOf(overlay)).toContain("text-white");
      expect(classesOf(overlay)).toContain("dark:text-(--ink-5)");

      for (const section of HOME_SECTIONS) {
        expect(overlay.textContent).toContain(section.label);
      }
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("hides the copy from assistive technology and gives it nothing to focus or click", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      const overlay = indicatorOf(mount);
      const interactive = queryFakeElements(overlay, (el) =>
        el !== overlay && (["A", "BUTTON", "INPUT"].includes(el.nodeName) || el.hasAttribute("tabindex")));

      expect(overlay.getAttribute("aria-hidden")).toBe("true");
      expect(classesOf(overlay)).toContain("pointer-events-none");
      expect(interactive).toEqual([]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});

describe("HomeFloatingNav active indicator", () => {
  test("clips the highlight to the active item on window resize", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      act(() => {
        triggerWindowEvent("resize");
      });

      expect(indicatorOf(mount).style.getPropertyValue("opacity")).toBe("1");
      expect(indicatorOf(mount).style.getPropertyValue("clipPath")).toBe(expectedClipPath(0));
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("re-measures when the list resizes", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      act(() => {
        triggerFakeResizeObservers();
      });

      expect(indicatorOf(mount).style.getPropertyValue("clipPath")).toBe(expectedClipPath(0));
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("re-measures once the web fonts have loaded", async () => {
    const resolveFonts = deferFakeFontsReady();
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      await act(async () => {
        resolveFonts();
        await Promise.resolve();
      });

      expect(indicatorOf(mount).style.getPropertyValue("clipPath")).toBe(expectedClipPath(0));
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("puts the highlight in place without a transition on first render and on re-measures", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      expect(classesOf(indicatorOf(mount))).not.toContain("transition");

      layOutNav(mount.container);

      act(() => {
        triggerFakeResizeObservers();
        triggerWindowEvent("resize");
      });

      expect(indicatorOf(mount).style.getPropertyValue("clipPath")).toBe(expectedClipPath(0));
      expect(classesOf(indicatorOf(mount))).not.toContain("transition");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("slides the highlight to the newly active item with a 250ms ease-in-out clip-path transition", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      act(() => {
        triggerWindowEvent("resize");
      });

      act(() => {
        mount.root.render(floatingNav(HOME_SECTIONS, "agentic"));
      });

      const agenticIndex = HOME_SECTIONS.findIndex((section) => section.id === "agentic");
      const classes = classesOf(indicatorOf(mount)).split(" ");

      expect(indicatorOf(mount).style.getPropertyValue("clipPath")).toBe(expectedClipPath(agenticIndex));
      expect(classes).toContain("transition-[clip-path]");
      expect(classes).toContain("duration-250");
      expect(classes).toContain("ease-in-out");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("jumps to the newly active item without a transition when reduced motion is preferred", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      act(() => {
        triggerWindowEvent("resize");
      });

      act(() => {
        mount.root.render(floatingNav(HOME_SECTIONS, "agentic"));
      });

      expect(classesOf(indicatorOf(mount)).split(" ")).toContain("motion-reduce:transition-none");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("hides the indicator when the active section loses its nav item", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      layOutNav(mount.container);

      act(() => {
        triggerWindowEvent("resize");
      });

      expect(indicatorOf(mount).style.getPropertyValue("opacity")).toBe("1");

      const withoutAgentic = HOME_SECTIONS.filter((section) => section.id !== "agentic");

      act(() => {
        mount.root.render(floatingNav(withoutAgentic, "agentic"));
      });

      expect(indicatorOf(mount).style.getPropertyValue("opacity")).toBe("0");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
