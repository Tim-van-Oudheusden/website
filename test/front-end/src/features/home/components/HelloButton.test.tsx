import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HelloButtonView } from "../../../../../../front-end/src/features/home/components/hello-button";

function renderHelloButtonView(props: {
  loading: boolean;
  message: string | null;
  error: string | null;
  onActivate: () => void;
}): string {
  return renderToStaticMarkup(createElement(HelloButtonView, props));
}

describe("HelloButtonView", () => {
  test("renders the idle prompt before any fetch", () => {
    const html = renderHelloButtonView({
      loading: false,
      message: null,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onActivate: () => {},
    });

    expect(html).toContain("Say Hello");
    expect(html).not.toContain("Requesting...");
  });

  test("renders the loading prompt and disables the button while requesting", () => {
    const html = renderHelloButtonView({
      loading: true,
      message: null,
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onActivate: () => {},
    });

    expect(html).toContain("Requesting...");
    expect(html).toContain("disabled");
  });

  test("renders the fetched message in a secondary badge on success", () => {
    const html = renderHelloButtonView({
      loading: false,
      message: "hello from the back-end",
      error: null,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onActivate: () => {},
    });

    expect(html).toContain("hello from the back-end");
    expect(html).toContain("bg-secondary");
  });

  test("renders the error in a destructive badge on failure", () => {
    const html = renderHelloButtonView({
      loading: false,
      message: null,
      error: "Failed to reach back-end",
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onActivate: () => {},
    });

    expect(html).toContain("Failed to reach back-end");
    expect(html).toContain("bg-destructive");
  });
});
