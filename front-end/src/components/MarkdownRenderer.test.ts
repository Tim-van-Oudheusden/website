import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  test("is exported as a memoized React component", () => {
    // React.memo wraps the component in an object with a type property
    expect(typeof MarkdownRenderer).toBe("object");
    expect(MarkdownRenderer).toHaveProperty("type");
    expect(typeof (MarkdownRenderer as unknown as { type: unknown }).type).toBe("function");
  });

  test("renders markdown image syntax as an img element", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownRenderer, {
        content: "![Tracking pixel](/content-assets/images/pixel.gif)",
      }),
    );

    expect(html).toContain("<img");
    expect(html).toContain('src="/content-assets/images/pixel.gif"');
  });
});
