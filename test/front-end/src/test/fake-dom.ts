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

/** Test-side DOM-style event object accepted by `dispatchEvent`. */
export interface FakeDomEvent {
  type: string;
  bubbles?: boolean;
  cancelable?: boolean;
  target?: FakeNode;
  currentTarget?: FakeNode;
  key?: string;
  button?: number;
  ctrlKey?: boolean;
  pointerType?: string;
  detail?: number;
  isPrimary?: boolean;
  /** Set by the harness' `preventDefault` so tests can observe a cancelled default action. */
  defaultPrevented?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

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
  /** DOM-style dispatch: routes by `event.type` through registered listeners. */
  dispatchEvent(event: FakeDomEvent): boolean;
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
    [key: string]: string | ((...args: never[]) => unknown);
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
  remove(): void;
  insertAdjacentElement(position: "beforebegin" | "afterbegin" | "beforeend" | "afterend", element: FakeNode): FakeNode | null;
  /** Element-node children (test-side surface for `aria-hidden` and friends). */
  readonly children: FakeElement[];
  /** Attribute-selector matcher (`[name]`, `[name="value"]`) over this subtree. */
  querySelectorAll(selector: string): FakeElement[];
  scrollTo(options: { left?: number; top?: number; behavior?: string }): void;
  /** Recorded `scrollIntoView` calls (test-side observation). */
  scrollIntoViewCalls: { behavior?: string; block?: string }[];
  scrollIntoView(options?: { behavior?: string; block?: string }): void;
  matches(selector: string): boolean;
  closest(selector: string): null;
  textContent: string;
  /** Not focusable unless `tabIndex >= 0`; consulted by focus-scope walks. */
  tabIndex: number;
  hidden: boolean;
  disabled?: boolean;
  /** Element parent, or null for the tree root. */
  get parentElement(): FakeElement | null;
  /** Class-name registry (`toggle(name, force)` mirrors the DOM signature). */
  get classList(): {
    add(name: string): void;
    remove(name: string): void;
    toggle(name: string, force?: boolean): boolean;
    contains(name: string): boolean;
  };
}

export interface FakeDocument {
  nodeType: 9;
  nodeName: string;
  documentElement: FakeElement;
  head: FakeElement;
  body: FakeElement;
  /** Currently focused element or null (focus-tracking tests observe this). */
  activeElement: FakeElement | null;
  createElement(tagName: string): FakeElement;
  createElementNS(namespaceURI: string, tagName: string): FakeElement;
  createTextNode(value: string): FakeNode;
  createComment(value: string): FakeNode;
  /** Attribute-selector matcher (`[name]`, `[name="value"]`) over the document tree. */
  querySelectorAll(selector: string): FakeElement[];
  /** First element in the document tree whose `id` attribute matches. */
  getElementById(id: string): FakeElement | null;
  /** Element-only tree walker honouring an optional `acceptNode` filter. */
  createTreeWalker(
    root: FakeNode,
    whatToShow: number,
    filter?: { acceptNode: (node: FakeNode) => number },
  ): { currentNode: FakeNode; nextNode(): boolean };
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  dispatchEvent(event: FakeDomEvent): boolean;
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
let permanent = false;
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

  dispatchEvent(event: FakeDomEvent): boolean {
    this.dispatch(event.type, event);
    if (event.bubbles === true) {
      let node = this.parentNode;
      while (node !== null) {
        node.dispatch(event.type, event);
        node = node.parentNode;
      }
    }
    return true;
  }
}

class FakeElementImpl extends FakeNodeImpl implements FakeElement {
  override nodeType = 1 as const;
  override nodeName = "";
  override ownerDocument: FakeDocument;
  tagName = "";
  namespaceURI = "http://www.w3.org/1999/xhtml";
  private readonly classNames = new Set<string>();
  clientWidth = 0;
  clientHeight = 0;
  tabIndex = 0;
  hidden = false;
  offsetWidth = 0;
  offsetHeight = 0;
  offsetLeft = 0;
  offsetTop = 0;
  scrollLeft = 0;
  scrollTop = 0;
  scrollWidth = 0;
  scrollHeight = 0;
  scrollCalls: { left?: number; top?: number; behavior?: string }[] = [];
  scrollIntoViewCalls: { behavior?: string; block?: string }[] = [];
  rect = { width: 0, height: 0 };
  private attributes = new Map<string, string>();
  style: FakeElement["style"] = {
    setProperty(name, value) { this[name] = value; },
    removeProperty(name) { Reflect.deleteProperty(this, name); },
    getPropertyValue(name) {
      const value = this[name];
      return typeof value === "string" ? value : "";
    },
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

  scrollIntoView(options: { behavior?: string; block?: string } = {}): void {
    this.scrollIntoViewCalls.push({ ...options });
  }

  matches(): boolean {
    return false;
  }

  closest(): null {
    return null;
  }

  get textContent(): string {
    return this.childNodes.map((child) =>
      child.nodeType === 1 ? (child as FakeElement).textContent : child.nodeValue ?? "",
    ).join("");
  }

  set textContent(value: string) {
    for (const child of [...this.childNodes]) this.removeChild(child);
    if (value !== "") this.appendChild(new FakeTextImpl(value, this.ownerDocument));
  }

  remove(): void {
    this.parentNode?.removeChild(this);
  }

  insertAdjacentElement(position: "beforebegin" | "afterbegin" | "beforeend" | "afterend", element: FakeNode): FakeNode | null {
    if (position === "beforebegin" || position === "afterend") return null;
    if (position === "afterbegin") {
      this.insertBefore(element, this.firstChild);
    } else {
      this.appendChild(element);
    }
    return element;
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((child) => child.nodeType === 1) as FakeElement[];
  }

  get parentElement(): FakeElement | null {
    return this.parentNode?.nodeType === 1 ? (this.parentNode as FakeElement) : null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const constraints = attributeConstraints(selector);
    if (constraints.length === 0) return [];
    return queryFakeElements(this, (element) =>
      element !== this && matchesAttributeConstraints(element, constraints),
    );
  }

  get classList(): FakeElement["classList"] {
    const names = this.classNames;
    return {
      add: (name: string) => { names.add(name); },
      remove: (name: string) => { names.delete(name); },
      toggle: (name: string, force?: boolean) => {
        const enable = force ?? !names.has(name);
        if (enable) names.add(name);
        else names.delete(name);
        return enable;
      },
      contains: (name: string) => names.has(name),
    };
  }
}

class FakeTextImpl extends FakeNodeImpl implements FakeNode {
  override nodeType = 3;
  override nodeName = "#text";

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
  override nodeType = 8;
  override nodeName = "#comment";

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
  const documentListeners = new Map<string, Set<(event: unknown) => void>>();
  const document: FakeDocument = {
    nodeType: 9,
    nodeName: "#document",
    documentElement: null as unknown as FakeElement,
    head: null as unknown as FakeElement,
    body: null as unknown as FakeElement,
    activeElement: null,
    createElement: (tagName) => new FakeElementImpl(tagName, document),
    createElementNS: (namespaceURI, tagName) => new FakeElementImpl(tagName, document, namespaceURI),
    createTextNode: (value) => new FakeTextImpl(value, document),
    createComment: (value) => new FakeCommentImpl(value, document),
    querySelectorAll: (selector) => {
      const constraints = attributeConstraints(selector);
      if (constraints.length === 0) return [];
      return queryFakeElements(document.documentElement, (element) =>
        matchesAttributeConstraints(element, constraints),
      );
    },
    getElementById: (id) => {
      const [found] = queryFakeElements(
        document.documentElement,
        (element) => element.getAttribute("id") === id,
      );
      return found ?? null;
    },
    createTreeWalker: (root, whatToShow, filter) =>
      new FakeTreeWalkerImpl(root, whatToShow, filter),
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      const set = documentListeners.get(type) ?? new Set();
      set.add(listener);
      documentListeners.set(type, set);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) => {
      documentListeners.get(type)?.delete(listener);
    },
    dispatchEvent: (event: { type: string }) => {
      for (const listener of documentListeners.get(event.type) ?? []) listener(event);
      return true;
    },
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
  "getComputedStyle",
  "localStorage",
  "NodeFilter",
  "requestAnimationFrame",
  "cancelAnimationFrame",
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

// Bare `getComputedStyle` used by Radix Presence; reads animation styles.
function makeComputedStyle(): Record<string, string | ((name: string) => string)> {
  return {
    animationName: "none",
    display: "block",
    position: "static",
    paddingLeft: "0px",
    getPropertyValue: () => "",
  };
}

/**
 * Animation frames run as `setTimeout(0)` tasks. Ids map to their timers so
 * `cancelAnimationFrame` really cancels (a cleanup that skips a pending frame
 * stays observable). Bare globals too: Radix Collapsible calls them unqualified.
 */
const pendingAnimationFrames = new Map<number, Timer>();
let nextAnimationFrameId = 1;

function requestFakeAnimationFrame(callback: (time: number) => void): number {
  const id = nextAnimationFrameId;
  nextAnimationFrameId += 1;
  pendingAnimationFrames.set(id, setTimeout(() => {
    pendingAnimationFrames.delete(id);
    callback(performance.now());
  }, 0));
  return id;
}

function cancelFakeAnimationFrame(id: number): void {
  clearTimeout(pendingAnimationFrames.get(id));
  pendingAnimationFrames.delete(id);
}

/** In-memory `localStorage` mirror so storage effects are observable. */
const fakeStorage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (key: string) => fakeStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { fakeStorage.set(key, value); },
  removeItem: (key: string) => { fakeStorage.delete(key); },
  clear: () => { fakeStorage.clear(); },
};

let systemPrefersDark = false;
const createdMediaQueryLists: FakeMediaQueryListImpl[] = [];

const NODE_FILTER = {
  SHOW_ELEMENT: 1,
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
} as const;

/** Minimal element walker: filters with `acceptNode`, iterates depth-first. */
class FakeTreeWalkerImpl {
  readonly root: FakeNode;
  readonly whatToShow: number;
  readonly filter?: { acceptNode: (node: FakeNode) => number } | undefined;
  currentNode: FakeNode;
  private readonly elements: FakeElement[];
  private index = -1;

  constructor(
    root: FakeNode,
    whatToShow: number,
    filter?: { acceptNode: (node: FakeNode) => number },
  ) {
    this.root = root;
    this.whatToShow = whatToShow;
    this.filter = filter;
    this.currentNode = root;
    this.elements = queryFakeElements(root, () => true);
  }

  nextNode(): boolean {
    while (this.index + 1 < this.elements.length) {
      this.index += 1;
      const node = this.elements[this.index];
      if (!node) continue;
      const verdict = this.filter?.acceptNode(node) ?? NODE_FILTER.FILTER_ACCEPT;
      if (verdict !== NODE_FILTER.FILTER_ACCEPT) continue;
      this.currentNode = node;
      return true;
    }
    return false;
  }
}

/**
 * `window.location` slice: `hash` normalizes like the DOM's (assigning `"x"`
 * reads back `"#x"`, assigning `""` clears it).
 */
class FakeLocationImpl {
  private fragment = "";

  get hash(): string { return this.fragment === "" ? "" : `#${this.fragment}`; }
  set hash(value: string) { this.fragment = value.startsWith("#") ? value.slice(1) : value; }
}

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * `window.matchMedia` result. Only the dark colour-scheme query tracks the
 * shared system preference; every other query (e.g. reduced motion) never
 * matches, so one file's theme flips cannot leak into unrelated media checks.
 */
class FakeMediaQueryListImpl {
  readonly media: string;
  onchange: ((event: unknown) => void) | null = null;
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(media: string) {
    this.media = media;
    createdMediaQueryLists.push(this);
  }

  get matches(): boolean { return this.media === DARK_SCHEME_QUERY && systemPrefersDark; }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  addListener(listener: (event: unknown) => void): void { this.addEventListener("change", listener); }
  removeListener(listener: (event: unknown) => void): void { this.removeEventListener("change", listener); }

  dispatchEvent(event: { type: string }): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    if (event.type === "change" && this.onchange !== null) this.onchange(event);
    return true;
  }
}

/** Flip the system dark preference and dispatch `change` to every dark-scheme MQL listener. */
export function triggerFakeMediaPreferenceChange(prefersDark: boolean): void {
  systemPrefersDark = prefersDark;
  const event = { type: "change", matches: prefersDark };
  for (const mql of createdMediaQueryLists) {
    if (mql.media === DARK_SCHEME_QUERY) mql.dispatchEvent(event);
  }
}

export function installFakeDom(): void {
  if (installed) return;
  installed = true;
  windowListeners.clear();
  fakeStorage.clear();
  createdMediaQueryLists.length = 0;
  systemPrefersDark = false;
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
  const location = new FakeLocationImpl();
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
    getComputedStyle: makeComputedStyle,
    // Radix primitives schedule timers via `window.setTimeout`/`clearTimeout`.
    setTimeout: (callback: () => void, ms?: number) => setTimeout(callback, ms),
    clearTimeout: (id: number) => { clearTimeout(id); },
    setInterval: (callback: () => void, ms?: number) => setInterval(callback, ms),
    clearInterval: (id: number) => { clearInterval(id); },
    localStorage: fakeLocalStorage,
    matchMedia: (query: string) => new FakeMediaQueryListImpl(query),
    requestAnimationFrame: requestFakeAnimationFrame,
    cancelAnimationFrame: cancelFakeAnimationFrame,
    focus: () => undefined,
    location,
    // `replaceState` only affects the fragment; that is all the app reads back.
    history: {
      replaceState: (_state: unknown, _unused: string, url?: string) => {
        if (url?.includes("#") === true) location.hash = url.slice(url.indexOf("#"));
      },
    },
    scrollY: 0,
    innerWidth: 1280,
    innerHeight: 800,
    ...domClasses,
  };

  const globals = {
    document,
    window,
    getComputedStyle: makeComputedStyle,
    NodeFilter: NODE_FILTER,
    localStorage: fakeLocalStorage,
    requestAnimationFrame: requestFakeAnimationFrame,
    cancelAnimationFrame: cancelFakeAnimationFrame,
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

/**
 * Install the fake DOM once for the whole test process (preload entry point).
 *
 * Radix primitives capture `globalThis?.document` at module load; any test
 * file that statically imports app components (App.test.tsx, TopBar.test.tsx)
 * therefore loads those modules before its own `beforeAll` can install the
 * fake DOM. Preloading keeps the install active for the run — per-file
 * install/uninstall calls become no-ops.
 */
export function installPermanentFakeDom(): void {
  permanent = true;
  installFakeDom();
}

export function uninstallFakeDom(): void {
  if (!installed || permanent) return;
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

interface AttributeConstraint {
  name: string;
  value: string | null;
}

/** Parse `[name]` / `[name="value"]` attribute constraints out of a selector. */
function attributeConstraints(selector: string): AttributeConstraint[] {
  return [...selector.matchAll(/\[([^\]~^$|*="']+)(?:="([^"]*)")?\]/g)]
    .map((match) => ({ name: match[1] ?? "", value: match[2] ?? null }));
}

function matchesAttributeConstraints(
  element: FakeElement,
  constraints: AttributeConstraint[],
): boolean {
  return constraints.every((constraint) => {
    const actual = element.getAttribute(constraint.name);
    return constraint.value === null
      ? actual !== null
      : actual === constraint.value;
  });
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
