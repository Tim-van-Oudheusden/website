import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import type { HelloResponse } from "shared";

import { HelloButton } from "../../../../../../front-end/src/features/home/components/hello-button";

import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";
import {
  fireFakePointer,
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  settleMicrotasks,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../../src/test/dom-harness";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so it
// must be imported after the fake DOM is installed by the harness. HelloButton
// uses its real hook and is driven through the fetch stub, like
// content-loader.test.ts.

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

function mountHelloButton(): FakeMount {
  return mountIntoBody(createElement(HelloButton));
}

function buttonText(button: FakeMount): string {
  const [element] = queryFakeElements(button.container, (el) => el.nodeName === "BUTTON");

  return element?.textContent ?? "";
}

function clickButton(button: FakeMount): void {
  const [element] = queryFakeElements(button.container, (el) => el.nodeName === "BUTTON");

  if (element === undefined) {
    throw new Error("Expected a hello button");
  }

  fireFakePointer(element, "click");
}

function unmount(button: FakeMount): void {
  unmountFakeDomRoot(button);
}

describe("HelloButton", () => {
  test("renders the idle prompt before any request", () => {
    const button = mountHelloButton();

    try {
      expect(buttonText(button)).toBe("Say Hello");
      expect(button.container.textContent).not.toContain("Requesting...");
    } finally {
      unmount(button);
    }
  });

  test("renders the loading prompt and disables the button while requesting", () => {
    // A fetch that never resolves keeps the request in flight.
    globalThis.fetch = mock(() => new Promise<Response>(() => undefined)) as unknown as typeof globalThis.fetch;
    const button = mountHelloButton();

    try {
      clickButton(button);

      expect(buttonText(button)).toBe("Requesting...");
      const [element] = queryFakeElements(button.container, (el) => el.nodeName === "BUTTON");

      expect(element?.getAttribute("disabled")).not.toBeNull();
    } finally {
      unmount(button);
    }
  });

  test("renders the fetched message on success", async () => {
    const message: HelloResponse = {
      message: "hello from the back-end",
      timestamp: "2026-01-01T00:00:00Z",
    };

    globalThis.fetch = mock(() => Promise.resolve(jsonResponse(message))) as unknown as typeof globalThis.fetch;
    const button = mountHelloButton();

    try {
      clickButton(button);

      await act(async () => {
        await settleMicrotasks();
      });

      expect(buttonText(button)).toBe("Say Hello");
      expect(button.container.textContent).toContain("hello from the back-end");
      expect(button.container.textContent).not.toContain("Failed to reach back-end");
    } finally {
      unmount(button);
    }
  });

  test("renders the request error on failure", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })),
    ) as unknown as typeof globalThis.fetch;

    const button = mountHelloButton();

    try {
      clickButton(button);

      await act(async () => {
        await settleMicrotasks();
      });

      expect(button.container.textContent).toContain("Request failed: Internal Server Error");
      expect(button.container.textContent).not.toContain("hello from the back-end");
      expect(button.container.textContent).toContain("Say Hello");
    } finally {
      unmount(button);
    }
  });
});
