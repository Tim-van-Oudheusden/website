import type { FakeElement, FakeNode } from "./fake-dom";
import { queryFakeElements } from "./fake-dom";

/** One list grid: the list's classes and its items' classes, in order. */
export interface ListLayout {
  list: string | null;
  items: (string | null)[];
}

/**
 * The layout of every list under `root`, so a loading skeleton can be compared
 * with the content that replaces it: equal layouts follow the same breakpoints.
 */
export function listLayouts(root: FakeNode): ListLayout[] {
  return queryFakeElements(root, (element) => element.nodeName === "UL").map((list) => ({
    list: list.getAttribute("class"),
    items: list.children.filter((item) => item.nodeName === "LI").map((item) => item.getAttribute("class")),
  }));
}

/** Whether `element` or one of its ancestors is hidden from assistive technology. */
export function isAriaHidden(element: FakeElement): boolean {
  for (let current: FakeElement | null = element; current !== null; current = current.parentElement) {
    if (current.getAttribute("aria-hidden") === "true") {
      return true;
    }
  }

  return false;
}

/** The element whose own text is `text`, asserting there is exactly one. */
export function elementWithText(root: FakeNode, text: string): FakeElement {
  const matches = queryFakeElements(
    root,
    (element) => element.textContent === text && element.children.length === 0,
  );
  const [match] = matches;

  if (match === undefined || matches.length !== 1) {
    throw new Error(`Expected one element with text "${text}", found ${String(matches.length)}`);
  }

  return match;
}

/** Whether `element` is visually hidden but still read by screen readers. */
export function isScreenReaderOnly(element: FakeElement): boolean {
  return (element.getAttribute("class") ?? "").split(/\s+/).includes("sr-only") && !isAriaHidden(element);
}
