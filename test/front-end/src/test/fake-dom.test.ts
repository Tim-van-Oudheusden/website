import { describe, expect, test } from "bun:test";

import type { FakeDocument } from "./fake-dom";

describe("fake DOM attributes", () => {
  test("setAttribute stores non-string values as strings, as real elements do", () => {
    const doc = document as unknown as FakeDocument;
    const el = doc.createElement("button");

    el.setAttribute("aria-expanded", false as unknown as string);
    el.setAttribute("data-inset", true as unknown as string);
    el.setAttribute("tabindex", -1 as unknown as string);

    expect(el.getAttribute("aria-expanded")).toBe("false");
    expect(el.getAttribute("data-inset")).toBe("true");
    expect(el.getAttribute("tabindex")).toBe("-1");
  });
});
