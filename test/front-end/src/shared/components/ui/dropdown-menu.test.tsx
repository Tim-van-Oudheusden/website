import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { ReactNode } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type * as DropdownModule from "../../../../../../front-end/src/shared/components/ui/dropdown-menu";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { findBySlot, fireDocumentKey, fireFakePointer, initFakeDomHarness, isFakeElement, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeDocument, FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

// Module-loading boundary: Radix captures `globalThis?.document` at module
// load, so it must be imported after the fake DOM is installed by the harness.
let DropdownMenu: typeof DropdownModule.DropdownMenu;
let DropdownMenuPortal: typeof DropdownModule.DropdownMenuPortal;
let DropdownMenuTrigger: typeof DropdownModule.DropdownMenuTrigger;
let DropdownMenuContent: typeof DropdownModule.DropdownMenuContent;
let DropdownMenuGroup: typeof DropdownModule.DropdownMenuGroup;
let DropdownMenuItem: typeof DropdownModule.DropdownMenuItem;
let DropdownMenuCheckboxItem: typeof DropdownModule.DropdownMenuCheckboxItem;
let DropdownMenuRadioGroup: typeof DropdownModule.DropdownMenuRadioGroup;
let DropdownMenuRadioItem: typeof DropdownModule.DropdownMenuRadioItem;
let DropdownMenuLabel: typeof DropdownModule.DropdownMenuLabel;
let DropdownMenuSeparator: typeof DropdownModule.DropdownMenuSeparator;
let DropdownMenuShortcut: typeof DropdownModule.DropdownMenuShortcut;
let DropdownMenuSub: typeof DropdownModule.DropdownMenuSub;
let DropdownMenuSubTrigger: typeof DropdownModule.DropdownMenuSubTrigger;
let DropdownMenuSubContent: typeof DropdownModule.DropdownMenuSubContent;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod: typeof DropdownModule = await import(
    "../../../../../../front-end/src/shared/components/ui/dropdown-menu"
  );

  DropdownMenu = mod.DropdownMenu;
  DropdownMenuPortal = mod.DropdownMenuPortal;
  DropdownMenuTrigger = mod.DropdownMenuTrigger;
  DropdownMenuContent = mod.DropdownMenuContent;
  DropdownMenuGroup = mod.DropdownMenuGroup;
  DropdownMenuItem = mod.DropdownMenuItem;
  DropdownMenuCheckboxItem = mod.DropdownMenuCheckboxItem;
  DropdownMenuRadioGroup = mod.DropdownMenuRadioGroup;
  DropdownMenuRadioItem = mod.DropdownMenuRadioItem;
  DropdownMenuLabel = mod.DropdownMenuLabel;
  DropdownMenuSeparator = mod.DropdownMenuSeparator;
  DropdownMenuShortcut = mod.DropdownMenuShortcut;
  DropdownMenuSub = mod.DropdownMenuSub;
  DropdownMenuSubTrigger = mod.DropdownMenuSubTrigger;
  DropdownMenuSubContent = mod.DropdownMenuSubContent;
});

afterAll(() => {
  uninstallFakeDom();
});

// ── SSR rendering (no DOM required) ──────────────────────────────────────────

describe("dropdown-menu primitives (SSR)", () => {
  test("trigger renders its child and forwards a caller className", () => {
    const html = renderToStaticMarkup(
      createElement(DropdownMenu, null,
        createElement(DropdownMenuTrigger, { className: "trigger-surface" }, "Open menu"),
      ),
    );

    expect(html).toContain('data-slot="dropdown-menu-trigger"');
    expect(html).toContain("trigger-surface");
    expect(html).toContain("Open menu");
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
  });

  test("closed content renders nothing server-side (its portal is client-only)", () => {
    const html = renderToStaticMarkup(
      createElement(DropdownMenu, null,
        createElement(DropdownMenuTrigger, null, "Open menu"),
        createElement(DropdownMenuContent, null, "Hidden"),
      ),
    );

    expect(html).not.toContain("dropdown-menu-content");
    expect(html).not.toContain("Hidden");
  });
});

// ── Interaction (fake DOM mount) ─────────────────────────────────────────────

interface MountedMenu {
  mount: FakeMount;
  openChangeEvents: boolean[];
  selectedItems: string[];
}

function menuChildren(selectedItems: string[]): ReactNode[] {
  return [
    createElement(DropdownMenuItem, { onSelect: () => {
      selectedItems.push("plain");
    } }, "Plain item"),
    createElement(DropdownMenuItem, { variant: "destructive", inset: true, className: "item-surface" }, "Delete"),
    createElement(DropdownMenuLabel, { inset: true }, "Section"),
    createElement(DropdownMenuSeparator),
    createElement(DropdownMenuItem, null, "Action", createElement(DropdownMenuShortcut, null, "⌘K")),
    createElement(DropdownMenuCheckboxItem, null, "Notify unchecked"),
    createElement(DropdownMenuCheckboxItem, { checked: true }, "Notify checked"),
    createElement(
      DropdownMenuRadioGroup,
      { value: "b" },
      createElement(DropdownMenuRadioItem, { value: "a" }, "Radio A"),
      createElement(DropdownMenuRadioItem, { value: "b" }, "Radio B"),
    ),
    createElement(DropdownMenuGroup, null,
      createElement(DropdownMenuItem, { onSelect: () => {
        selectedItems.push("grouped");
      } }, "Grouped item"),
    ),
    createElement(
      DropdownMenuSub,
      null,
      createElement(DropdownMenuSubTrigger, { inset: true }, "More tools"),
      // forceMount keeps the sub-content present even while the submenu is
      // closed, letting the wrapper render without driving sub-menu state.
      createElement(DropdownMenuPortal, { forceMount: true },
        createElement(DropdownMenuSubContent, null, "Sub content"),
      ),
    ),
  ];
}

function mountMenu(): MountedMenu {
  const openChangeEvents: boolean[] = [];
  const selectedItems: string[] = [];
  const mount = mountIntoBody(
    createElement(
      DropdownMenu,
      { onOpenChange: (open) => {
        openChangeEvents.push(open);
      } },
      createElement(DropdownMenuTrigger, { asChild: true }, createElement("button", null, "Open menu")),
      createElement(DropdownMenuContent, null, ...menuChildren(selectedItems)),
    ),
  );

  return { mount, openChangeEvents, selectedItems };
}

function openMenu(menu: MountedMenu): FakeElement {
  const trigger = findBySlot(menu.mount.container, "dropdown-menu-trigger");

  fireFakePointer(trigger, "pointerdown");
  const doc = document as unknown as FakeDocument;

  return findBySlot(doc.body, "dropdown-menu-content");
}

describe("dropdown-menu interaction", () => {
  test("opens on trigger pointer-down and runs the selected item's callback", () => {
    const menu = mountMenu();

    try {
      const trigger = findBySlot(menu.mount.container, "dropdown-menu-trigger");

      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      const content = openMenu(menu);

      expect(trigger.getAttribute("aria-expanded")).toBe("true");

      const items = queryFakeElements(content, (el) => el.getAttribute("data-slot") === "dropdown-menu-item");

      expect(items.map((item) => item.textContent)).toContain("Plain item");

      const plainItem = items.find((item) => item.textContent === "Plain item");

      if (!isFakeElement(plainItem)) {
        throw new Error("Expected a plain menu item");
      }

      fireFakePointer(plainItem, "click");
      expect(menu.selectedItems).toEqual(["plain"]);
    } finally {
      unmountFakeDomRoot(menu.mount);
    }
  });

  test("Escape closes the menu and reports both transitions through onOpenChange", () => {
    const menu = mountMenu();
    const doc = document as unknown as FakeDocument;

    try {
      const trigger = findBySlot(menu.mount.container, "dropdown-menu-trigger");

      openMenu(menu);

      fireDocumentKey(doc, "Escape");

      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(queryFakeElements(doc.body, (el) => el.getAttribute("data-slot") === "dropdown-menu-content")).toHaveLength(0);
      expect(menu.openChangeEvents).toEqual([true, false]);
    } finally {
      unmountFakeDomRoot(menu.mount);
    }
  });

  test("items carry variant and inset data attributes plus caller classes", () => {
    const menu = mountMenu();

    try {
      const content = openMenu(menu);

      const destructive = queryFakeElements(
        content,
        (el) => el.getAttribute("data-variant") === "destructive",
      );

      expect(destructive).toHaveLength(1);
      expect(destructive[0]?.getAttribute("data-inset")).toBe("true");
      expect(destructive[0]?.getAttribute("class")).toContain("item-surface");
    } finally {
      unmountFakeDomRoot(menu.mount);
    }
  });

  test("checkbox and radio items render their selection indicators", () => {
    const menu = mountMenu();

    try {
      const content = openMenu(menu);

      const checkboxes = queryFakeElements(
        content,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-checkbox-item",
      );

      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]?.getAttribute("data-state")).toBe("unchecked");
      expect(checkboxes[1]?.getAttribute("data-state")).toBe("checked");

      const radios = queryFakeElements(
        content,
        (el) => el.getAttribute("data-slot") === "dropdown-menu-radio-item",
      );

      expect(radios).toHaveLength(2);
      expect(radios[0]?.getAttribute("data-state")).toBe("unchecked");
      expect(radios[1]?.getAttribute("data-state")).toBe("checked");
    } finally {
      unmountFakeDomRoot(menu.mount);
    }
  });

  test("label, separator, shortcut, group, and sub wrappers render inside the content", () => {
    const menu = mountMenu();
    const doc = document as unknown as FakeDocument;

    try {
      const content = openMenu(menu);

      expect(findBySlot(content, "dropdown-menu-label").textContent).toContain("Section");
      expect(findBySlot(content, "dropdown-menu-label").getAttribute("data-inset")).toBe("true");
      expect(findBySlot(content, "dropdown-menu-separator").getAttribute("role")).toBe("separator");
      expect(findBySlot(content, "dropdown-menu-shortcut").textContent).toContain("⌘K");
      expect(findBySlot(content, "dropdown-menu-group").textContent).toContain("Grouped item");
      expect(findBySlot(content, "dropdown-menu-sub-trigger").getAttribute("data-inset")).toBe("true");
      // The sub wrapper's explicit portal slots its props onto the sub content
      // (asChild), so no separate portal element is rendered — assert the content.
      const subContent = findBySlot(doc.body, "dropdown-menu-sub-content");

      expect(subContent.textContent).toContain("Sub content");
    } finally {
      unmountFakeDomRoot(menu.mount);
    }
  });
});
