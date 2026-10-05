import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import { HomeFloatingNav } from "../../../../../../front-end/src/features/home/components/home-floating-nav";
import type { HomeSectionDefinition, HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";

import { queryFakeElements, triggerWindowEvent, uninstallFakeDom, type FakeElement } from "../../../../src/test/fake-dom";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";

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

describe("HomeFloatingNav", () => {
  test("uses the discover-button black for its active indicator highlight", () => {
    const html = renderFloatingNav();

    expect(html).toContain("bg-(--adw-dark-5)");
    expect(html).not.toContain("bg-primary");
  });

  test("uses the section well surface in dark mode to match the light scheme", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:bg-(--site-section-well-bg)");
    expect(html).not.toContain("dark:bg-(--adw-page-brown-bg)");
  });

  test("keeps active nav text white in dark mode while indicator remains black", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:text-(--adw-light-1)");
    expect(html).toContain("bg-(--adw-dark-5)");
  });
});

describe("HomeFloatingNav active indicator", () => {
  test("re-measures the active item on window resize", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      navAnchor(mount.container, "start").rect = { width: 96, height: 40 };

      act(() => {
        triggerWindowEvent("resize");
      });

      const indicator = findBySlot(mount.container, "active-indicator");

      expect(indicator.style.getPropertyValue("opacity")).toBe("1");
      expect(indicator.style.getPropertyValue("width")).toBe("96px");
      expect(indicator.style.getPropertyValue("height")).toBe("40px");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("follows the active section to its nav item", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      navAnchor(mount.container, "start").rect = { width: 96, height: 40 };
      navAnchor(mount.container, "proof").rect = { width: 150, height: 40 };

      act(() => {
        mount.root.render(floatingNav(HOME_SECTIONS, "proof"));
      });

      expect(findBySlot(mount.container, "active-indicator").style.getPropertyValue("width")).toBe("150px");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("hides the indicator when the active section loses its nav item", () => {
    const mount = mountIntoBody(floatingNav(HOME_SECTIONS, "start"));

    try {
      navAnchor(mount.container, "start").rect = { width: 96, height: 40 };

      act(() => {
        triggerWindowEvent("resize");
      });

      const indicator = findBySlot(mount.container, "active-indicator");

      expect(indicator.style.getPropertyValue("opacity")).toBe("1");

      const withoutProof = HOME_SECTIONS.filter((section) => section.id !== "proof");

      act(() => {
        mount.root.render(floatingNav(withoutProof, "proof"));
      });

      expect(indicator.style.getPropertyValue("opacity")).toBe("0");
      expect(indicator.style.getPropertyValue("width")).toBe("0px");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
