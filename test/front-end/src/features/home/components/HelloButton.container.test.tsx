import { beforeAll, describe, expect, mock, test } from "bun:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { UseApiGetResult } from "@/shared/hooks/use-api-get";

/**
 * Container tests: the loader fetches only on click and this harness cannot
 * click, so `useApiGet` is module-mocked with a scripted result per state.
 * The mock must be installed before `hello-button` is evaluated, which is why
 * the component is loaded dynamically here (module-loading boundary) rather
 * than statically at the top of the file — a static import would capture the
 * unmocked hook.
 */
const scriptedApiGet: { status: UseApiGetResult<{ message: string }>["status"]; data: { message: string } | null; error: string | null } = {
  status: "idle",
  data: null,
  error: null,
};

let HelloButton: ComponentType;

beforeAll(async () => {
  void mock.module("@/shared/hooks/use-api-get", () => ({
    useApiGet: () => ({
      status: scriptedApiGet.status,
      data: scriptedApiGet.data,
      error: scriptedApiGet.error,
      refetch: () => Promise.resolve(),
    }),
  }));
  ({ HelloButton } = await import("../../../../../../front-end/src/features/home/components/hello-button"));
});

function renderContainer(): string {
  return renderToStaticMarkup(createElement(HelloButton));
}

describe("HelloButton", () => {
  test("renders the idle prompt before any request", () => {
    scriptedApiGet.status = "idle";
    scriptedApiGet.data = null;
    scriptedApiGet.error = null;

    const html = renderContainer();

    expect(html).toContain("Say Hello");
    expect(html).not.toContain("Requesting...");
  });

  test("renders the loading state from the api hook", () => {
    scriptedApiGet.status = "loading";
    scriptedApiGet.data = null;
    scriptedApiGet.error = null;

    const html = renderContainer();

    expect(html).toContain("Requesting...");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Say Hello");
  });

  test("renders the success message delivered by the api hook", () => {
    scriptedApiGet.status = "success";
    scriptedApiGet.data = { message: "hello from the back-end" };
    scriptedApiGet.error = null;

    const html = renderContainer();

    expect(html).toContain("hello from the back-end");
    expect(html).not.toContain("Failed to reach back-end");
    expect(html).toContain("Say Hello");
  });

  test("renders the error surfaced by the api hook", () => {
    scriptedApiGet.status = "error";
    scriptedApiGet.data = null;
    scriptedApiGet.error = "Failed to reach back-end";

    const html = renderContainer();

    expect(html).toContain("Failed to reach back-end");
    expect(html).not.toContain("hello from the back-end");
    expect(html).toContain("Say Hello");
  });
});