/**
 * Shared mount/event helpers for fake-DOM interaction tests.
 *
 * Complements `fake-dom.ts`: fake-dom installs globals; this module mounts
 * React trees into the fake document and fires the events the delegated
 * React/ Radix listeners react to, so test files stop re-implementing the
 * same harness.
 */
import { act, type ReactNode } from "react";
import type { createRoot as CreateRootValue, Root } from "react-dom/client";

import {
  installFakeDom,
  queryFakeElements,
  type FakeDocument,
  type FakeDomEvent,
  type FakeElement,
} from "./fake-dom";

type CreateRootFn = typeof CreateRootValue;

let createRootFn: CreateRootFn | null = null;

/** Install the fake DOM and defer-load react-dom/client (canUseDOM boundary). */
export async function initFakeDomHarness(): Promise<void> {
  installFakeDom();
  // Module-loading boundary: react-dom captures `canUseDOM` at module load, so
  // it must be imported after the fake DOM globals exist.
  ({ createRoot: createRootFn } = await import("react-dom/client"));
}

export interface FakeMount {
  container: FakeElement;
  root: Root;
}

/** Mount `node` into a fresh container appended to the fake document body. */
export function mountIntoBody(node: ReactNode): FakeMount {
  if (createRootFn === null) throw new Error("Call initFakeDomHarness() in beforeAll first");
  const doc = document as unknown as FakeDocument;
  const container = doc.createElement("div");
  doc.body.appendChild(container);
  const root: Root = createRootFn(container as unknown as Element);
  act(() => { root.render(node); });
  return { container, root };
}

/** Unmount the tree and remove its container from the fake body. */
export function unmountFakeDomRoot(mount: FakeMount): void {
  const doc = document as unknown as FakeDocument;
  act(() => { mount.root.unmount(); });
  doc.body.removeChild(mount.container);
}

export function isFakeElement(node: FakeElement | undefined): node is FakeElement {
  return node !== undefined;
}

/** First element under `root` carrying `slot` as its data-slot attribute. */
export function findBySlot(root: FakeElement, slot: string): FakeElement {
  const [found] = queryFakeElements(root, (el) => el.getAttribute("data-slot") === slot);
  if (!isFakeElement(found)) throw new Error(`No element with data-slot="${slot}"`);
  return found;
}

/** All elements under `root` carrying `slot` as their data-slot attribute. */
export function findAllBySlot(root: FakeElement, slot: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.getAttribute("data-slot") === slot);
}

/**
 * Fire a bubbling pointer-ish event (`pointerdown`, `click`, ...) at
 * `element`; React's delegated listeners pick it up from the root container.
 */
export function fireFakePointer(element: FakeElement, type: string): void {
  const event: FakeDomEvent = {
    type,
    target: element,
    currentTarget: element,
    bubbles: true,
    cancelable: true,
    button: 0,
    ctrlKey: false,
    pointerType: "mouse",
    isPrimary: true,
    detail: 1,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  };
  act(() => { element.dispatchEvent(event); });
}

/**
 * Fire a key event at document level; Radix's DismissableLayer registers its
 * Escape (and similar) handling there.
 */
export function fireDocumentKey(doc: FakeDocument, key: string): void {
  const event: FakeDomEvent = {
    type: "keydown",
    key,
    bubbles: true,
    cancelable: true,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  };
  act(() => { doc.dispatchEvent(event); });
}

/** Minimal JSON Response for `apiGet`'s parse step. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Enough microticks for a fetch -> json -> guard -> setState chain to land. */
export async function settleMicrotasks(): Promise<void> {
  for (let index = 0; index < 25; index += 1) {
    await Promise.resolve();
  }
}