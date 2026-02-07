import { describe, expect, test } from "bun:test";
import { MarkdownRenderer } from "./MarkdownRenderer";

describe("MarkdownRenderer", () => {
  test("is exported as a memoized React component", () => {
    // React.memo wraps the component in an object with a type property
    expect(typeof MarkdownRenderer).toBe("object");
    expect(MarkdownRenderer).toHaveProperty("type");
    expect(typeof (MarkdownRenderer as unknown as { type: unknown }).type).toBe("function");
  });
});
