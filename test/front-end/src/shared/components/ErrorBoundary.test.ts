import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { ErrorBoundaryProps, ErrorBoundaryState } from "../../../../../front-end/src/shared/components/error-boundary";
import { ErrorBoundary, renderErrorFallback } from "../../../../../front-end/src/shared/components/error-boundary";

const HEALTHY_CHILD = createElement("span", null, "healthy content");

/**
 * Harness note: react-dom's server renderers do not invoke
 * `getDerivedStateFromError` (verified experimentally), so a throwing child
 * cannot be rendered through the boundary with `renderToStaticMarkup`. These
 * tests drive the boundary through the same state contract React's client
 * reconciler applies: `getDerivedStateFromError` for the error state, and an
 * updater that applies `setState` the way the reconciler would on mount (the
 * never-mounted default updater is a no-op).
 */
interface BoundaryUpdater {
  enqueueSetState(
    inst: ErrorBoundary,
    partialState:
      | ((state: ErrorBoundaryState, props: ErrorBoundaryProps) => ErrorBoundaryState)
      | Partial<ErrorBoundaryState>,
    callback: (() => void) | undefined,
  ): void;
}

function applyErrorState(instance: ErrorBoundary): void {
  instance.state = ErrorBoundary.getDerivedStateFromError();
}

function mountUpdater(instance: ErrorBoundary): void {
  (instance as ErrorBoundary & { updater: BoundaryUpdater }).updater = {
    enqueueSetState(inst, partialState, callback) {
      inst.state = typeof partialState === "function"
        ? partialState(inst.state, inst.props)
        : { ...inst.state, ...partialState };

      if (callback !== undefined) {
        callback();
      }
    },
  };
}

describe("ErrorBoundary", () => {
  test("renders children normally when no error has occurred", () => {
    const instance = new ErrorBoundary({ children: HEALTHY_CHILD, fallback: renderErrorFallback });

    expect(renderToStaticMarkup(instance.render())).toContain("healthy content");
  });

  test("computes the captured-error state via getDerivedStateFromError", () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true });
  });

  test("renders the default fallback with a retry control after a child error", () => {
    const instance = new ErrorBoundary({ children: HEALTHY_CHILD, fallback: renderErrorFallback });

    applyErrorState(instance);
    const html = renderToStaticMarkup(instance.render());

    expect(html).toContain("Failed to render content.");
    expect(html).toContain("Try again");
    expect(html).toContain("button");
    expect(html).not.toContain("healthy content");
  });

  test("renders the provided fallback with a retry that recovers the children", () => {
    const retries: (() => void)[] = [];
    const instance = new ErrorBoundary({
      children: HEALTHY_CHILD,
      fallback: (retry) => {
        retries.push(retry);

        return createElement("div", null, "custom fallback");
      },
    });

    applyErrorState(instance);
    mountUpdater(instance);
    const html = renderToStaticMarkup(instance.render());

    expect(html).toContain("custom fallback");
    expect(html).not.toContain("Failed to render content.");

    retries[0]?.();
    expect(renderToStaticMarkup(instance.render())).toContain("healthy content");
  });
});
