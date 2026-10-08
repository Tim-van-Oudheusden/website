import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { PageData } from "shared";

import type * as StandalonePageModule from "../../../../../../front-end/src/features/standalone-pages/pages/standalone-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, jsonResponse, mountIntoBody, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so it
// must be imported after the fake DOM is installed by the harness.
let StandalonePage: typeof StandalonePageModule.StandalonePage;

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod = await import("../../../../../../front-end/src/features/standalone-pages/pages/standalone-page");

  StandalonePage = mod.StandalonePage;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

function stubFetch(response: Response): ReturnType<typeof mock> {
  const fetchMock = mock(() => Promise.resolve(response));

  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

  return fetchMock;
}

function nowPage(): PageData {
  return {
    slug: "now",
    title: "Now",
    description: "What I am focused on at the moment.",
    updated: "2026-10-01",
    body: "Building a **launcher**.",
  };
}

function mountPage(slug: string): FakeMount {
  return mountIntoBody(
    createElement(MemoryRouter, null, createElement(StandalonePage, { slug })),
  );
}

function textsOf(page: FakeMount, nodeName: string): string[] {
  return queryFakeElements(page.container, (el) => el.nodeName === nodeName).map((el) => el.textContent);
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

describe("StandalonePage", () => {
  test("renders the loading state before the page resolves", () => {
    stubFetch(jsonResponse(nowPage()));
    const page = mountPage("now");

    try {
      expect(page.container.textContent).toContain("Loading page...");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("fetches its own slug and renders the title, description, update date and body", async () => {
    const fetchMock = stubFetch(jsonResponse(nowPage()));
    const page = mountPage("now");

    try {
      await settle();

      const text = page.container.textContent;

      expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/pages/now");
      expect(textsOf(page, "H1")).toEqual(["Now"]);
      expect(text).toContain("What I am focused on at the moment.");
      expect(text).toContain("Last updated October 1, 2026");
      expect(textsOf(page, "STRONG")).toEqual(["launcher"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("renders the not-found state when the page does not exist", async () => {
    stubFetch(jsonResponse({ error: "Page not found" }, 404));
    const page = mountPage("missing");

    try {
      await settle();

      expect(page.container.textContent).toContain("Page not found");
      const hrefs = queryFakeElements(page.container, (el) => el.nodeName === "A").map((el) => el.getAttribute("href"));

      expect(hrefs).toEqual(["/"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("surfaces the message of a non-404 failure", async () => {
    stubFetch(jsonResponse({}, 500));
    const page = mountPage("now");

    try {
      await settle();

      expect(page.container.textContent).toContain("Request failed");
      expect(page.container.textContent).not.toContain("Page not found");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
