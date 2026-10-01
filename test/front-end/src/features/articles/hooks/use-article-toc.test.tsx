import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot, type Container, type Root } from "react-dom/client";
import { useArticleToc, type UseArticleTocResult } from "../../../../../../front-end/src/features/articles/hooks/use-article-toc";
import type { ArticleData } from "shared/articles";

interface FakeNode {
  nodeType: number;
  ownerDocument: FakeDocument | null;
  childNodes: unknown[];
  tagName: string;
  namespaceURI: string | null;
  appendChild: (child: unknown) => unknown;
  removeChild: (child: unknown) => unknown;
  insertBefore: (child: unknown, reference: unknown) => unknown;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  addEventListener: (type: string, listener: unknown, options?: unknown) => void;
  removeEventListener: (type: string, listener: unknown, options?: unknown) => void;
}

interface HeadingElement {
  getBoundingClientRect: () => { top: number };
}

interface FakeDocument {
  nodeType: number;
  activeElement: null;
  createElement: () => FakeNode;
  createTextNode: (text: string) => { nodeType: number; nodeValue: string; ownerDocument: FakeDocument };
  body: FakeNode;
  addEventListener: (type: string, listener: unknown, options?: unknown) => void;
  removeEventListener: (type: string, listener: unknown, options?: unknown) => void;
  getElementById: (id: string) => HeadingElement | null;
}

interface FakeWindow {
  innerHeight: number;
  HTMLIFrameElement: new () => object;
  addEventListener: (type: string, listener: unknown, options?: unknown) => void;
  removeEventListener: (type: string, listener: unknown, options?: unknown) => void;
  requestAnimationFrame: (cb: () => void) => number;
  cancelAnimationFrame: (id: number) => void;
}

// A constructor so react-dom's `container instanceof HTMLIFrameElement` check
// resolves in the fake DOM. The method exists only to keep the class
// non-extraneous to the linter.
class HTMLIFrameElement {
  toString(): string {
    return "HTMLIFrameElement";
  }
}

function makeFakeNode(ownerDocument: FakeDocument | null): FakeNode {
  return {
    nodeType: 1,
    ownerDocument,
    childNodes: [],
    tagName: "div",
    namespaceURI: null,
    appendChild: (child) => child,
    removeChild: (child) => child,
    insertBefore: (child) => child,
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}

interface Environment {
  container: FakeNode;
  documentStub: FakeDocument;
  windowStub: FakeWindow;
  rafQueue: (() => void)[];
  windowListeners: Map<string, Set<unknown>>;
  documentListeners: Map<string, Set<unknown>>;
  headingElements: Map<string, HeadingElement>;
}

function makeFakeEnvironment(): Environment {
  const headingElements = new Map<string, HeadingElement>();
  const windowListeners = new Map<string, Set<unknown>>();
  const documentListeners = new Map<string, Set<unknown>>();
  const bodyNode = makeFakeNode(null);
  const documentStub: FakeDocument = {
    nodeType: 9,
    activeElement: null,
    createElement: () => makeFakeNode(documentStub),
    createTextNode: (text) => ({ nodeType: 3, nodeValue: text, ownerDocument: documentStub }),
    body: bodyNode,
    addEventListener: (type, listener) => {
      if (!documentListeners.has(type)) documentListeners.set(type, new Set());
      documentListeners.get(type)?.add(listener);
    },
    removeEventListener: (type, listener) => {
      documentListeners.get(type)?.delete(listener);
    },
    getElementById: (id) => headingElements.get(id) ?? null,
  };
  bodyNode.ownerDocument = documentStub;
  const container = makeFakeNode(documentStub);
  const rafQueue: (() => void)[] = [];
  const windowStub: FakeWindow = {
    innerHeight: 800,
    HTMLIFrameElement,
    addEventListener: (type, listener) => {
      if (!windowListeners.has(type)) windowListeners.set(type, new Set());
      windowListeners.get(type)?.add(listener);
    },
    removeEventListener: (type, listener) => {
      windowListeners.get(type)?.delete(listener);
    },
    requestAnimationFrame: (cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    },
    cancelAnimationFrame: (id) => {
      if (id >= 1 && id <= rafQueue.length) {
        rafQueue[id - 1] = () => undefined;
      }
    },
  };
  return { container, documentStub, windowStub, rafQueue, windowListeners, documentListeners, headingElements };
}

function withFakeDom<T>(fn: (env: Environment, root: Root) => T): T {
  const env = makeFakeEnvironment();
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, "document", { value: env.documentStub, configurable: true });
  Object.defineProperty(globalThis, "window", { value: env.windowStub, configurable: true });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, configurable: true });
  try {
    // FakeNode satisfies react-dom's structural Container checks (nodeType, tagName,
    // namespaceURI); the cast is a library-type mismatch, not a data boundary.
    const rootContainer: Container = env.container as unknown as Container;
    const root: Root = createRoot(rootContainer);
    return fn(env, root);
  } finally {
    Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
    Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: undefined, configurable: true });
  }
}

function makeArticle(body: string): ArticleData {
  return {
    title: "Test article",
    description: "A test article.",
    date: "2026-01-01",
    tags: [],
    type: "article",
    draft: false,
    category: "test",
    slug: "test-article",
    body,
  };
}

let currentResult: UseArticleTocResult = { tocItems: [], visibleTocHeadingIds: [] };

function Harness({ article, loading }: { article: ArticleData | null; loading: boolean }): null {
  currentResult = useArticleToc(article, loading);
  return null;
}

function flushRaf(env: Environment): void {
  const pending = env.rafQueue.splice(0);
  pending.forEach((callback) => {
    callback();
  });
}

function renderAndFlush(env: Environment, root: Root, article: ArticleData | null, loading: boolean): void {
  act(() => {
    root.render(createElement(Harness, { article, loading }));
  });
  act(() => {
    flushRaf(env);
  });
}

describe("useArticleToc", () => {
  test("extracts toc items from the article body", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup\n\n### Config\n\nbody");
      act(() => {
        root.render(createElement(Harness, { article, loading: false }));
      });

      expect(currentResult.tocItems.map((item) => ({ id: item.id, depth: item.depth }))).toEqual([
        { id: "intro", depth: 1 },
        { id: "setup", depth: 2 },
        { id: "config", depth: 3 },
      ]);
    });
  });

  test("returns an empty toc and no visible ids for a null article", () => {
    withFakeDom((env, root) => {
      act(() => {
        root.render(createElement(Harness, { article: null, loading: false }));
      });

      expect(currentResult.tocItems).toEqual([]);
      expect(currentResult.visibleTocHeadingIds).toEqual([]);
      expect(env.windowListeners.get("scroll")?.size ?? 0).toBe(0);
    });
  });

  test("tracks only the headings above the viewport fold", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      env.headingElements.set("intro", { getBoundingClientRect: () => ({ top: 10 }) });
      env.headingElements.set("setup", { getBoundingClientRect: () => ({ top: 900 }) });

      renderAndFlush(env, root, article, false);

      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);
    });
  });

  test("recomputes visible ids when the scroll handler fires", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      const introRect = { top: 10 };
      const setupRect = { top: 900 };
      env.headingElements.set("intro", { getBoundingClientRect: () => introRect });
      env.headingElements.set("setup", { getBoundingClientRect: () => setupRect });

      renderAndFlush(env, root, article, false);
      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);

      // Scroll so "setup" moves above the fold.
      setupRect.top = 200;
      const scrollHandlers = env.windowListeners.get("scroll");
      expect(scrollHandlers?.size).toBe(1);
      act(() => {
        scrollHandlers?.forEach((handler) => {
          (handler as () => void)();
        });
      });
      act(() => {
        flushRaf(env);
      });

      expect(currentResult.visibleTocHeadingIds).toEqual(["intro", "setup"]);
    });
  });

  test("resets visible ids and stops tracking while loading", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      env.headingElements.set("intro", { getBoundingClientRect: () => ({ top: 10 }) });

      renderAndFlush(env, root, article, false);
      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);

      act(() => {
        root.render(createElement(Harness, { article, loading: true }));
      });

      expect(currentResult.visibleTocHeadingIds).toEqual([]);
      expect(env.windowListeners.get("scroll")?.size ?? 0).toBe(0);
      expect(env.documentListeners.get("scroll")?.size ?? 0).toBe(0);
    });
  });

  test("removes listeners and cancels the pending update on unmount", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      env.headingElements.set("intro", { getBoundingClientRect: () => ({ top: 10 }) });

      act(() => {
        root.render(createElement(Harness, { article, loading: false }));
      });

      expect(env.windowListeners.get("scroll")?.size).toBe(1);
      expect(env.windowListeners.get("resize")?.size).toBe(1);
      expect(env.documentListeners.get("scroll")?.size).toBe(1);

      act(() => {
        root.unmount();
      });

      expect(env.windowListeners.get("scroll")?.size ?? 0).toBe(0);
      expect(env.windowListeners.get("resize")?.size ?? 0).toBe(0);
      expect(env.documentListeners.get("scroll")?.size ?? 0).toBe(0);
    });
  });

  test("keeps visible ids unchanged when a recompute yields the same result", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      env.headingElements.set("intro", { getBoundingClientRect: () => ({ top: 10 }) });
      env.headingElements.set("setup", { getBoundingClientRect: () => ({ top: 900 }) });

      renderAndFlush(env, root, article, false);
      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);

      // Fire the scroll handler again without moving any heading; the recompute
      // yields the same ids, so the dedup short-circuit returns the current list.
      const scrollHandlers = env.windowListeners.get("scroll");
      act(() => {
        scrollHandlers?.forEach((handler) => {
          (handler as () => void)();
        });
      });
      act(() => {
        flushRaf(env);
      });

      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);
    });
  });

  test("excludes a toc heading that has no dom element", () => {
    withFakeDom((env, root) => {
      const article = makeArticle("# Intro\n\n## Setup");
      // Only "intro" has a DOM element; "setup" does not.
      env.headingElements.set("intro", { getBoundingClientRect: () => ({ top: 10 }) });

      renderAndFlush(env, root, article, false);

      // "setup" has no element, so its rect is null and it is excluded.
      expect(currentResult.visibleTocHeadingIds).toEqual(["intro"]);
    });
  });
});
