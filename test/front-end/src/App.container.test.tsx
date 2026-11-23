import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import type { JSX } from "react";
import { act, createElement, lazy, Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { AppShell } from "../../../front-end/src/App";

import type { FakeMount } from "./test/dom-harness";
import {
  fireFakePointer,
  initFakeDomHarness,
  mountIntoBody,
  settleMicrotasks,
  unmountFakeDomRoot,
} from "./test/dom-harness";
import type { FakeElement } from "./test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "./test/fake-dom";

/*
 * A deploy replaces the hashed chunks, so a tab opened before it gets the SPA shell (text/html) for its old
 * chunk URL and the dynamic import rejects. React.lazy rethrows that rejection while rendering.
 */
const StaleChunkPage = lazy(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")));

function StaleChunkRoute(): JSX.Element {
  return (
    <main id="main-content">
      <Suspense fallback={<p>Loading…</p>}>
        <StaleChunkPage />
      </Suspense>
    </main>
  );
}

beforeAll(async () => {
  await initFakeDomHarness();
});

beforeEach(() => {
  // React and the boundary both log the caught error; keep the test output to the assertions.
  spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  mock.restore();
});

afterAll(() => {
  uninstallFakeDom();
});

function mountShell(path: string, routes: Record<string, JSX.Element>): FakeMount {
  return mountIntoBody(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <Routes>
          {Object.entries(routes).map(([routePath, element]) => (
            <Route key={routePath} path={routePath} element={element} />
          ))}
        </Routes>
      </AppShell>
    </MemoryRouter>,
  );
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

function elementsNamed(mount: FakeMount, nodeName: string): FakeElement[] {
  return queryFakeElements(mount.container, (el) => el.nodeName === nodeName);
}

function headings(mount: FakeMount): (string | null)[] {
  return elementsNamed(mount, "H1").map((heading) => heading.textContent);
}

function button(mount: FakeMount, label: string): FakeElement {
  const [found] = queryFakeElements(mount.container, (el) => el.nodeName === "BUTTON" && el.textContent === label);

  if (found === undefined) {
    throw new Error(`No button labelled ${label}`);
  }

  return found;
}

describe("AppShell route error boundary", () => {
  test("keeps the top bar and offers a reload in the page's place when a lazy chunk from an older build fails to load", async () => {
    const reload = mock(() => undefined);

    window.location.reload = reload;
    const mount = mountShell("/agentic", { "/agentic": createElement(StaleChunkRoute) });

    try {
      await settle();

      expect(elementsNamed(mount, "HEADER")).toHaveLength(1);
      expect(headings(mount)).toEqual(["This page failed to load"]);
      expect(elementsNamed(mount, "MAIN").map((main) => main.getAttribute("id"))).toEqual(["main-content"]);

      fireFakePointer(button(mount, "Reload page"), "click");

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      unmountFakeDomRoot(mount);
      Reflect.deleteProperty(window.location, "reload");
    }
  });

  test("clears the error when the visitor follows a top-bar link to another page", async () => {
    const mount = mountShell("/agentic", {
      "/agentic": createElement(StaleChunkRoute),
      "/projects": <main id="main-content"><h1>Projects</h1></main>,
    });

    try {
      await settle();
      expect(headings(mount)).toEqual(["This page failed to load"]);

      const [projectsLink] = queryFakeElements(mount.container, (el) => el.nodeName === "A" && el.getAttribute("href") === "/projects");

      fireFakePointer(projectsLink!, "click");

      expect(headings(mount)).toEqual(["Projects"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("renders the page again on Try again, once whatever made it throw has passed", async () => {
    let failing = true;

    function FlakyPage(): JSX.Element {
      if (failing) {
        throw new TypeError("Cannot read properties of undefined (reading 'map')");
      }

      return <main id="main-content"><h1>Agentic</h1></main>;
    }

    const mount = mountShell("/agentic", { "/agentic": createElement(FlakyPage) });

    try {
      await settle();
      expect(elementsNamed(mount, "HEADER")).toHaveLength(1);
      expect(headings(mount)).toEqual(["This page failed to load"]);

      failing = false;
      fireFakePointer(button(mount, "Try again"), "click");

      expect(headings(mount)).toEqual(["Agentic"]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
