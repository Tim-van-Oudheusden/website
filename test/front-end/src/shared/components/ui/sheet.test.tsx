import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as SheetModule from "../../../../../../front-end/src/shared/components/ui/sheet";

import {
  uninstallFakeDom,
  queryFakeElements,
  type FakeDocument,
  type FakeElement,
} from "../../../../src/test/fake-dom";
import {
  findBySlot,
  fireDocumentKey,
  fireFakePointer,
  initFakeDomHarness,
  isFakeElement,
  mountIntoBody,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../../src/test/dom-harness";

// Module-loading boundary: Radix captures `globalThis?.document` at module
// load, so it must be imported after the fake DOM is installed by the harness.
let Sheet: typeof SheetModule.Sheet;
let SheetTrigger: typeof SheetModule.SheetTrigger;
let SheetClose: typeof SheetModule.SheetClose;
let SheetContent: typeof SheetModule.SheetContent;
let SheetHeader: typeof SheetModule.SheetHeader;
let SheetFooter: typeof SheetModule.SheetFooter;
let SheetTitle: typeof SheetModule.SheetTitle;
let SheetDescription: typeof SheetModule.SheetDescription;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod: typeof SheetModule = await import(
    "../../../../../../front-end/src/shared/components/ui/sheet"
  );

  Sheet = mod.Sheet;
  SheetTrigger = mod.SheetTrigger;
  SheetClose = mod.SheetClose;
  SheetContent = mod.SheetContent;
  SheetHeader = mod.SheetHeader;
  SheetFooter = mod.SheetFooter;
  SheetTitle = mod.SheetTitle;
  SheetDescription = mod.SheetDescription;
});

afterAll(() => {
  uninstallFakeDom();
});

// ── SSR rendering (no DOM required) ──────────────────────────────────────────

describe("sheet primitives (SSR)", () => {
  test("trigger and close render their slots and children", () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, null,
        createElement(SheetTrigger, { className: "trigger-surface" }, "Open sheet"),
        createElement(SheetClose, { className: "close-surface" }, "Dismiss"),
      ),
    );

    expect(html).toContain('data-slot="sheet-trigger"');
    expect(html).toContain("trigger-surface");
    expect(html).toContain("Open sheet");
    expect(html).toContain('data-slot="sheet-close"');
    expect(html).toContain("close-surface");
    expect(html).toContain("Dismiss");
  });

  test("header, footer, title, and description render their slots and content", () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, null,
        createElement(SheetHeader, { className: "head-surface" }, "Header text"),
        createElement(SheetFooter, { className: "foot-surface" }, "Footer text"),
        createElement(SheetTitle, null, "Sheet title"),
        createElement(SheetDescription, { className: "desc-surface" }, "Sheet description"),
      ),
    );

    expect(html).toContain('data-slot="sheet-header"');
    expect(html).toContain("head-surface");
    expect(html).toContain("Header text");
    expect(html).toContain('data-slot="sheet-footer"');
    expect(html).toContain("foot-surface");
    expect(html).toContain("Footer text");
    expect(html).toContain('data-slot="sheet-title"');
    expect(html).toContain("Sheet title");
    expect(html).toContain('data-slot="sheet-description"');
    expect(html).toContain("desc-surface");
    expect(html).toContain("Sheet description");
  });

  test("closed content renders nothing server-side (its portal is client-only)", () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, null,
        createElement(SheetTrigger, null, "Open sheet"),
        createElement(SheetContent, null, "Hidden"),
      ),
    );

    expect(html).not.toContain("sheet-content");
    expect(html).not.toContain("Hidden");
  });
});

// ── Interaction (fake DOM mount) ─────────────────────────────────────────────

interface MountedSheet {
  mount: FakeMount;
  openChangeEvents: boolean[];
}

function sheetBody(): ReactNode[] {
  return [
    createElement(SheetHeader, null,
      createElement(SheetTitle, null, "Sheet title"),
      createElement(SheetDescription, null, "Sheet description"),
    ),
    createElement(SheetFooter, null, "Footer text"),
  ];
}

function mountSheet(props: Parameters<typeof SheetContent>[0] = {}, open?: boolean): MountedSheet {
  const openChangeEvents: boolean[] = [];
  const mount = mountIntoBody(
    createElement(
      Sheet,
      {
        onOpenChange: (next) => {
          openChangeEvents.push(next);
        },
        // Omitting `open` keeps the sheet uncontrolled for trigger-driven tests.
        ...(open === undefined ? {} : { open }),
      },
      createElement(SheetTrigger, { asChild: true }, createElement("button", null, "Open sheet")),
      createElement(SheetContent, props, ...sheetBody()),
    ),
  );

  return { mount, openChangeEvents };
}

function openSheet(sheet: MountedSheet): FakeElement {
  const trigger = findBySlot(sheet.mount.container, "sheet-trigger");

  fireFakePointer(trigger, "click");
  const doc = document as unknown as FakeDocument;

  return findBySlot(doc.body, "sheet-content");
}

describe("sheet interaction", () => {
  test("opens from the trigger with overlay, content, and the close button", () => {
    const sheet = mountSheet();
    const doc = document as unknown as FakeDocument;

    try {
      const content = openSheet(sheet);

      expect(content.getAttribute("data-state")).toBe("open");
      expect(content.textContent).toContain("Sheet title");
      expect(content.textContent).toContain("Sheet description");
      expect(content.textContent).toContain("Footer text");

      const overlay = findBySlot(doc.body, "sheet-overlay");

      expect(overlay.getAttribute("data-state")).toBe("open");

      const closeButtons = queryFakeElements(content, (el) => el.nodeName === "BUTTON");

      expect(closeButtons).toHaveLength(1);
      expect(closeButtons[0]?.textContent).toContain("Close");
    } finally {
      unmountFakeDomRoot(sheet.mount);
    }
  });

  test("controlled open renders the sheet without any trigger click", () => {
    const sheet = mountSheet({}, true);
    const doc = document as unknown as FakeDocument;

    try {
      const content = findBySlot(doc.body, "sheet-content");

      expect(content.getAttribute("data-state")).toBe("open");
    } finally {
      unmountFakeDomRoot(sheet.mount);
    }
  });

  test("Escape closes the sheet and reports both transitions through onOpenChange", () => {
    const sheet = mountSheet();
    const doc = document as unknown as FakeDocument;

    try {
      openSheet(sheet);

      fireDocumentKey(doc, "Escape");

      expect(queryFakeElements(doc.body, (el) => el.getAttribute("data-slot") === "sheet-content")).toHaveLength(0);
      expect(queryFakeElements(doc.body, (el) => el.getAttribute("data-slot") === "sheet-overlay")).toHaveLength(0);
      expect(sheet.openChangeEvents).toEqual([true, false]);
    } finally {
      unmountFakeDomRoot(sheet.mount);
    }
  });

  test("the close button closes the sheet", () => {
    const sheet = mountSheet();
    const doc = document as unknown as FakeDocument;

    try {
      const content = openSheet(sheet);
      const [closeButton] = queryFakeElements(content, (el) => el.nodeName === "BUTTON");

      if (!isFakeElement(closeButton)) {
        throw new Error("Expected a close button");
      }

      fireFakePointer(closeButton, "click");

      expect(queryFakeElements(doc.body, (el) => el.getAttribute("data-slot") === "sheet-content")).toHaveLength(0);
      expect(sheet.openChangeEvents).toEqual([true, false]);
    } finally {
      unmountFakeDomRoot(sheet.mount);
    }
  });

  test("showCloseButton=false omits the built-in close button", () => {
    const sheet = mountSheet({ showCloseButton: false });

    try {
      const content = openSheet(sheet);

      expect(queryFakeElements(content, (el) => el.nodeName === "BUTTON")).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(sheet.mount);
    }
  });
});
