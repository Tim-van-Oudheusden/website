import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type * as ThemeToggleModule from "../../../../../front-end/src/shared/components/theme-toggle";
import type * as UseThemeModule from "../../../../../front-end/src/shared/hooks/use-theme";
import {
  findBySlot,
  fireFakePointer,
  initFakeDomHarness,
  isFakeElement,
  mountIntoBody,
  unmountFakeDomRoot,
} from "../../../src/test/dom-harness";
import type { FakeDocument } from "../../../src/test/fake-dom";
import { queryFakeElements, triggerFakeMediaPreferenceChange, uninstallFakeDom } from "../../../src/test/fake-dom";

// Module-loading boundary: Radix captures `globalThis?.document` at module
// load, so it must be imported after the fake DOM is installed by the harness.
let ThemeToggle: typeof ThemeToggleModule.ThemeToggle;
let ThemeProvider: typeof UseThemeModule.ThemeProvider;

beforeAll(async () => {
  await initFakeDomHarness();
  const toggleMod: typeof ThemeToggleModule = await import(
    "../../../../../front-end/src/shared/components/theme-toggle"
  );
  const themeMod: typeof UseThemeModule = await import(
    "../../../../../front-end/src/shared/hooks/use-theme"
  );

  ThemeToggle = toggleMod.ThemeToggle;
  ThemeProvider = themeMod.ThemeProvider;
});

afterAll(() => {
  uninstallFakeDom();
});

// Shared fake-DOM state persists across files under the bunfig preload; give
// every test a deterministic light system preference.
beforeEach(() => {
  triggerFakeMediaPreferenceChange(false);
});

describe("ThemeToggle (SSR)", () => {
  test("renders the trigger icons and an accessible toggle label", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle));

    expect(html).toContain('data-slot="dropdown-menu-trigger"');
    expect(html).toContain("Toggle theme");
    expect(html).toContain("svg");
    // No theme is marked active before a provider reports one.
    expect(html).not.toContain("Active");
  });

  test("forwards the trigger and icon classes to their elements", () => {
    const html = renderToStaticMarkup(
      createElement(ThemeToggle, { triggerClassName: "trigger-tint", iconClassName: "icon-tint" }),
    );

    expect(html).toContain("trigger-tint");
    expect(html).toContain("icon-tint");
  });
});

describe("ThemeToggle interaction (with ThemeProvider)", () => {
  test("without a provider the toggle renders but switching is inert", () => {
    const doc = document as unknown as FakeDocument;
    const button = mountIntoBody(createElement(ThemeToggle));

    try {
      const trigger = findBySlot(button.container, "dropdown-menu-trigger");

      fireFakePointer(trigger, "pointerdown");
      const content = findBySlot(doc.body, "dropdown-menu-content");
      const items = queryFakeElements(
        content,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-item",
      );
      const darkItem = items.find((item) => item.textContent.startsWith("Dark"));

      if (!isFakeElement(darkItem)) {
        throw new Error("Expected a Dark menu item");
      }

      fireFakePointer(darkItem, "click");

      // The default context's setTheme is a no-op: no storage, no class change.
      expect(window.localStorage.getItem("theme")).toBe(null);
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
    } finally {
      unmountFakeDomRoot(button);
      window.localStorage.clear();
    }
  });

  test("marks the stored theme active, and switching to dark applies the dark class", () => {
    const doc = document as unknown as FakeDocument;
    const button = mountIntoBody(
      createElement(ThemeProvider, null, createElement(ThemeToggle)),
    );

    try {
      // Fresh provider defaults to the light theme: no dark class applied.
      expect(doc.documentElement.classList.contains("dark")).toBe(false);

      const trigger = findBySlot(button.container, "dropdown-menu-trigger");

      fireFakePointer(trigger, "pointerdown");
      const content = findBySlot(doc.body, "dropdown-menu-content");

      const items = queryFakeElements(
        content,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-item",
      );
      const lightItem = items.find((item) => item.textContent.startsWith("Light"));

      if (!isFakeElement(lightItem)) {
        throw new Error("Expected a Light menu item");
      }

      expect(lightItem.textContent).toContain("Active");

      const darkItem = items.find((item) => item.textContent.startsWith("Dark"));

      if (!isFakeElement(darkItem)) {
        throw new Error("Expected a Dark menu item");
      }

      fireFakePointer(darkItem, "click");

      expect(doc.documentElement.classList.contains("dark")).toBe(true);
      expect(window.localStorage.getItem("theme")).toBe("dark");

      // Reopening the menu shows the new active theme.
      fireFakePointer(trigger, "pointerdown");
      const reopened = findBySlot(doc.body, "dropdown-menu-content");
      const reopenedItems = queryFakeElements(
        reopened,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-item",
      );
      const activeDarkItem = reopenedItems.find((item) => item.textContent.startsWith("Dark"));
      const activeLightItem = reopenedItems.find((item) => item.textContent.startsWith("Light"));

      if (!isFakeElement(activeDarkItem) || !isFakeElement(activeLightItem)) {
        throw new Error("Expected Light and Dark menu items");
      }

      expect(activeDarkItem.textContent).toContain("Active");
      expect(activeLightItem.textContent).not.toContain("Active");

      // Switching back to light re-applies the light theme.
      const lightReopenItem = reopenedItems.find((item) => item.textContent.startsWith("Light"));

      if (!isFakeElement(lightReopenItem)) {
        throw new Error("Expected a Light menu item");
      }

      fireFakePointer(lightReopenItem, "click");
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
      expect(window.localStorage.getItem("theme")).toBe("light");
    } finally {
      unmountFakeDomRoot(button);
      window.localStorage.clear();
    }
  });

  test("the system option follows the live media preference", () => {
    const doc = document as unknown as FakeDocument;
    const button = mountIntoBody(
      createElement(ThemeProvider, null, createElement(ThemeToggle)),
    );

    try {
      const trigger = findBySlot(button.container, "dropdown-menu-trigger");

      fireFakePointer(trigger, "pointerdown");
      const content = findBySlot(doc.body, "dropdown-menu-content");
      const items = queryFakeElements(
        content,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-item",
      );
      const systemItem = items.find((item) => item.textContent.startsWith("System"));

      if (!isFakeElement(systemItem)) {
        throw new Error("Expected a System menu item");
      }

      fireFakePointer(systemItem, "click");

      expect(window.localStorage.getItem("theme")).toBe("system");
      // The beforeEach reset gives every test a light system preference.
      expect(doc.documentElement.classList.contains("dark")).toBe(false);

      triggerFakeMediaPreferenceChange(true);
      expect(doc.documentElement.classList.contains("dark")).toBe(true);

      triggerFakeMediaPreferenceChange(false);
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
    } finally {
      unmountFakeDomRoot(button);
      window.localStorage.clear();
    }
  });
});
