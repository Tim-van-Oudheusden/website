import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeFloatingNav } from "../../../../../../front-end/src/features/home/components/home-floating-nav";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeSectionDefinition, HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";
import { findBySlot, initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, triggerWindowEvent, uninstallFakeDom } from "../../../../src/test/fake-dom";

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

  test("shows the recent-posts entry as what's new with the newspaper icon, linking to #whats-new", () => {
    const html = renderFloatingNav();
    const anchor = /<a[^>]*href="#whats-new"[^>]*>(.*?)<\/a>/.exec(html);

    expect(anchor?.[1]).toContain("lucide-newspaper");
    expect(anchor?.[1]?.replaceAll("&#x27;", "'")).toContain("what's new");
  });

  test("keeps active nav text white in dark mode while indicator remains black", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:text-(--adw-light-1)");
    expect(html).toContain("bg-(--adw-dark-5)");
  });

  test("lists the about-me section as \"about me\" with the id-card icon, linking to #about-me", () => {
    const anchor = /<a [^>]*href="#about-me"[^>]*>[\s\S]*?<\/a>/.exec(renderFloatingNav())?.[0] ?? "";

    expect(anchor).toContain("lucide-id-card");
    expect(anchor).toContain("about me");
  });

  test("lists the experience section as \"experience\" with the briefcase icon, linking to #experience", () => {
    const anchor = /<a [^>]*href="#experience"[^>]*>[\s\S]*?<\/a>/.exec(renderFloatingNav())?.[0] ?? "";

    expect(anchor).toContain("lucide-briefcase-business");
    expect(anchor).toContain("experience");
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
      navAnchor(mount.container, "about-me").rect = { width: 150, height: 40 };

      act(() => {
        mount.root.render(floatingNav(HOME_SECTIONS, "about-me"));
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

      const withoutAboutMe = HOME_SECTIONS.filter((section) => section.id !== "about-me");

      act(() => {
        mount.root.render(floatingNav(withoutAboutMe, "about-me"));
      });

      expect(indicator.style.getPropertyValue("opacity")).toBe("0");
      expect(indicator.style.getPropertyValue("width")).toBe("0px");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
