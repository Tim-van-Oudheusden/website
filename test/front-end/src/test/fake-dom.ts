/**
 * Minimal fake DOM for interaction tests.
 *
 * The repo has no DOM library (jsdom/happy-dom are not dependencies and new
 * dependencies require approval), but a handful of components exercise DOM
 * handlers (click, mousemove, scroll) that `renderToStaticMarkup` cannot
 * reach. This module installs the smallest set of `document`/`window`/DOM
 * class globals under which React 19's `createRoot` + `act` mount, update,
 * dispatch delegated events, and unmount.
 *
 * React 19 specifics this fake must honour:
 * - `react-dom` captures `canUseDOM` at module load, so `installFakeDom()`
 *   must run before `react-dom/client` is first evaluated (see the
 *   `beforeAll` + dynamic-import pattern in the test files).
 * - For a single static text child React never calls `createTextNode`; it
 *   sets `element.textContent` on mount and updates via
 *   `textNode.nodeValue` / `textNode.textContent`, so both accessors must
 *   round-trip through `nodeValue`.
 * - Delegated events (click, mousemove, mouseout, mouseover) are attached
 *   to the root container. `onMouseEnter`/`onMouseLeave` are synthesized
 *   from the delegated `mouseover`/`mouseout` events: to fire
 *   `onMouseLeave`, dispatch `mouseout` on the root container with
 *   `target` = the element and `relatedTarget` = null (or a node outside
 *   the element). A raw `mouseleave` dispatch does nothing.
 *
 * `installFakeDom` / `uninstallFakeDom` are idempotent-safe: uninstall
 * restores whatever globals existed before install.
 */

export interface FakeNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  parentNode: FakeNode | null;
  ownerDocument: FakeDocument | null;
  childNodes: FakeNode[];
  firstChild: FakeNode | null;
  lastChild: FakeNode | null;
  nextSibling: FakeNode | null;
  previousSibling: FakeNode | null;
  appendChild(child: FakeNode): FakeNode;
  insertBefore(child: FakeNode, before: FakeNode | null): FakeNode;
  removeChild(child: FakeNode): FakeNode;
  replaceChild(newChild: FakeNode, oldChild: FakeNode): FakeNode;
  contains(other: FakeNode): boolean;
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  /** Invoke the listeners registered for `type` (test-side event dispatch). */
  dispatch(type: string, event: unknown): void;
}

export interface FakeElement extends FakeNode {
  nodeType: 1;
  nodeName: string;
  tagName: string;
  namespaceURI: string;
  clientWidth: number;
  clientHeight: number;
  offsetWidth: number;
  offsetHeight: number;
  offsetLeft: number;
  offsetTop: number;
  scrollLeft: number;
  scrollTop: number;
  scrollWidth: number;
  scrollHeight: number;
  /** Recorded `scrollTo` calls (test-side observation). */
  scrollCalls: { left?: number; top?: number; behavior?: string }[];
  style: {
    [key: string]: string;
    setProperty(name: string, value: string): void;
    removeProperty(name: string): void;
    getPropertyValue(name: string): string;
  };
  /** Settable bounds used by `getBoundingClientRect` (test-side input). */
  rect: { width: number; height: number };
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  getBoundingClientRect(): {
    left: number; top: number; right: number; bottom: number;
    width: number; height: number; x: number; y: number;
  };
  focus(): void;
  blur(): void;
  click(): void;
  scrollTo(options: { left?: number; top?: number; behavior?: string }): void;
  matches(selector: string): boolean;
  closest(selector: string): null;
  textContent: string;
}

export interface FakeDocument {
  nodeType: 9;
  nodeName: string;
  documentElement: FakeElement;
  head: FakeElement;
  body: FakeElement;
  createElement(tagName: string): FakeElement;
  createElementNS(namespaceURI: string, tagName: string): FakeElement;
  createTextNode(value: string): FakeNode;
  createComment(value: string): FakeNode;
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}

export interface FakeDomClasses {
  HTMLElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  Element: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  Node: new () => FakeNode;
  Text: new (value: string, doc: FakeDocument) => FakeNode;
  Comment: new (value: string, doc: FakeDocument) => FakeNode;
  SVGElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  HTMLIFrameElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  HTMLInputElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  HTMLSelectElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  HTMLTextAreaElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
  HTMLImageElement: new (tagName: string, doc: FakeDocument, namespaceURI?: string) => FakeElement;
}

let installed = false;
let previousGlobals: Record<string, unknown> = {};
const windowListeners = new Map<string, Set<(event: unknown) => void>>();

class FakeNodeImpl implements FakeNode {
  nodeType = 0;
  nodeName = "";
  nodeValue: string | null = null;
  parentNode: FakeNode | null = null;
  ownerDocument: FakeDocument | null = null;
  childNodes: FakeNode[] = [];
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }

  get nextSibling(): FakeNode | null {
    if (this.parentNode === null) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] ?? null;
  }

  get previousSibling(): FakeNode | null {
    if (this.parentNode === null) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) - 1] ?? null;
  }

  appendChild(child: FakeNode): FakeNode {
    if (child.parentNode !== null) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child: FakeNode, before: FakeNode | null): FakeNode {
    if (child.parentNode !== null) child.parentNode.removeChild(child);
    child.parentNode = this;
    const index = before !== null ? this.childNodes.indexOf(before) : -1;
    if (index === -1) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild(child: FakeNode): FakeNode {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild(newChild: FakeNode, oldChild: FakeNode): FakeNode {
    const index = this.childNodes.indexOf(oldChild);
    if (index !== -1) {
      oldChild.parentNode = null;
      newChild.parentNode = this;
      this.childNodes[index] = newChild;
    }
    return oldChild;
  }

  contains(other: FakeNode): boolean {
    let node: FakeNode | null = other;
    while (node !== null) {
      if (node === this) return true;
      node = node.parentNode;
    }
    return false;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeElementImpl extends FakeNodeImpl implements FakeElement {
  nodeType = 1;
  nodeName = "";
  tagName = "";
  namespaceURI = "http://www.w3.org/1999/xhtml";
  clientWidth = 0;
  clientHeight = 0;
  offsetWidth = 0;
  offsetHeight = 0;
  offsetLeft = 0;
  offsetTop = 0;
  scrollLeft = 0;
  scrollTop = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  scrollCalls: { left?: number; top?: number; behavior?: string }[] = [];
  rect = { width: 0, height: 0 };
  private attributes = new Map<string, string>();
  style: FakeElement["style"] = {
    setProperty(name, value) { this[name] = value; },
    removeProperty(name) { Reflect.deleteProperty(this, name); },
    getPropertyValue(name) { return this[name] ?? ""; },
  };

  constructor(tagName: string, doc: FakeDocument, namespaceURI = "http://www.w3.org/1999/xhtml") {
    super();
    this.nodeName = tagName.toUpperCase();
    this.tagName = tagName.toUpperCase();
    this.namespaceURI = namespaceURI;
    this.ownerDocument = doc;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.has(name) ? this.attributes.get(name) ?? null : null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  getBoundingClientRect(): {
    left: number; top: number; right: number; bottom: number;
    width: number; height: number; x: number; y: number;
  } {
    const { width, height } = this.rect;
    return { left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0 };
  }

  focus = (): void => undefined;
  blur = (): void => undefined;
  click = (): void => undefined;

  scrollTo(options: { left?: number; top?: number; behavior?: string }): void {
    this.scrollCalls.push({ ...options });
    if (typeof options.left === "number") this.scrollLeft = options.left;
  }

  matches(): boolean {
    return false;
  }

  closest(): null {
    return null;
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.nodeValue ?? "").join("");
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    if (value !== "") this.appendChild(new FakeTextImpl(value, this.ownerDocument));
  }
}

class FakeTextImpl extends FakeNodeImpl implements FakeNode {
  nodeType = 3;
  nodeName = "#text";

  constructor(value: string, doc: FakeDocument) {
    super();
    this.nodeValue = value;
    this.ownerDocument = doc;
  }

  get textContent(): string {
    return this.nodeValue ?? "";
  }

  set textContent(value: string) {
    this.nodeValue = value;
  }
}

class FakeCommentImpl extends FakeNodeImpl implements FakeNode {
  nodeType = 8;
  nodeName = "#comment";

  constructor(value: string, doc: FakeDocument) {
    super();
    this.nodeValue = value;
    this.ownerDocument = doc;
  }
}

class FakeResizeObserverImpl {
  static readonly instances: FakeResizeObserverImpl[] = [];
  readonly callback: (
    entries: { target: FakeElement }[],
    observer: FakeResizeObserverImpl,
  ) => void;
  observedTargets: FakeElement[] = [];
  disconnected = false;

  constructor(
    callback: (
      entries: { target: FakeElement }[],
      observer: FakeResizeObserverImpl,
    ) => void,
  ) {
    this.callback = callback;
    FakeResizeObserverImpl.instances.push(this);
  }

  observe(target: FakeElement): void {
    this.observedTargets.push(target);
  }

  unobserve(target: FakeElement): void {
    this.observedTargets = this.observedTargets.filter(
      (observed) => observed !== target,
    );
  }

  disconnect(): void {
    this.disconnected = true;
    this.observedTargets = [];
  }
}

function makeDocument(): FakeDocument {
  const document: FakeDocument = {
    nodeType: 9,
    nodeName: "#document",
    documentElement: null as unknown as FakeElement,
    head: null as unknown as FakeElement,
    body: null as unknown as FakeElement,
    createElement: (tagName) => new FakeElementImpl(tagName, document),
    createElementNS: (namespaceURI, tagName) => new FakeElementImpl(tagName, document, namespaceURI),
    createTextNode: (value) => new FakeTextImpl(value, document),
    createComment: (value) => new FakeCommentImpl(value, document),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  document.documentElement = new FakeElementImpl("html", document);
  document.head = new FakeElementImpl("head", document);
  document.body = new FakeElementImpl("body", document);
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);
  return document;
}

const GLOBAL_NAMES = [
  "document",
  "window",
  "HTMLElement",
  "Element",
  "Node",
  "Text",
  "Comment",
  "SVGElement",
  "HTMLIFrameElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLTextAreaElement",
  "HTMLImageElement",
  "MutationObserver",
  "ResizeObserver",
  "IS_REACT_ACT_ENVIRONMENT",
] as const;

export function installFakeDom(): void {
  if (installed) return;
  installed = true;
  windowListeners.clear();
  FakeResizeObserverImpl.instances.length = 0;

  for (const name of GLOBAL_NAMES) {
    previousGlobals[name] = (globalThis as Record<string, unknown>)[name];
  }

  const document = makeDocument();
  const domClasses: FakeDomClasses = {
    HTMLElement: FakeElementImpl,
    Element: FakeElementImpl,
    Node: FakeNodeImpl,
    Text: FakeTextImpl,
    Comment: FakeCommentImpl,
    SVGElement: FakeElementImpl,
    HTMLIFrameElement: FakeElementImpl,
    HTMLInputElement: FakeElementImpl,
    HTMLSelectElement: FakeElementImpl,
    HTMLTextAreaElement: FakeElementImpl,
    HTMLImageElement: FakeElementImpl,
  };
  const window = {
    document,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      const set = windowListeners.get(type) ?? new Set();
      set.add(listener);
      windowListeners.set(type, set);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      windowListeners.get(type)?.delete(listener);
    },
    getComputedStyle: () => ({
      paddingLeft: "0px",
      getPropertyValue: () => "",
    }),
    requestAnimationFrame: (callback: () => void) => {
      setTimeout(callback, 0);
      return 1;
    },
    cancelAnimationFrame: (id: number) => { clearTimeout(id); },
    focus: () => undefined,
    innerWidth: 1280,
    innerHeight: 800,
    ...domClasses,
  };

  const globals = {
    document,
    window,
    ...domClasses,
    MutationObserver: class {
      observe = (): void => undefined;
      disconnect = (): void => undefined;
    },
    ResizeObserver: FakeResizeObserverImpl,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globals)) {
    defineGlobal(name, value);
  }
}

// `defineProperty` (not plain assignment) so install can also replace globals
// that other tests in the same process defined as configurable but non-writable.
function defineGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

export function uninstallFakeDom(): void {
  if (!installed) return;
  installed = false;
  for (const name of GLOBAL_NAMES) {
    const previous = previousGlobals[name];
    if (previous === undefined) Reflect.deleteProperty(globalThis, name);
    else defineGlobal(name, previous);
  }
  previousGlobals = {};
  windowListeners.clear();
}

/** Depth-first collection of elements matching `predicate` under `root`. */
export function queryFakeElements(
  root: FakeNode,
  predicate: (element: FakeElement) => boolean,
): FakeElement[] {
  const found: FakeElement[] = [];
  const visit = (node: FakeNode): void => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue;
      const element = child as FakeElement;
      if (predicate(element)) found.push(element);
      visit(element);
    }
  };
  visit(root);
  return found;
}

/** Invoke the callbacks of all connected fake ResizeObservers (test-side event dispatch). */
export function triggerFakeResizeObservers(): void {
  for (const observer of FakeResizeObserverImpl.instances) {
    if (observer.disconnected) continue;
    observer.callback(
      observer.observedTargets.map((target) => ({ target })),
      observer,
    );
  }
}

/** Invoke the fake window's `resize` listeners (test-side event dispatch). */
export function triggerWindowResize(): void {
  const event = { type: "resize" };
  windowListeners.get("resize")?.forEach((listener) => { listener(event); });
}
