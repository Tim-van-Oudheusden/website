import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { TopBar } from "./TopBar";

function renderTopBar(): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(TopBar)),
  );
}

describe("TopBar", () => {
  test("uses a fully opaque background without transparency", () => {
    const html = renderTopBar();
    expect(html).not.toContain("bg-background/80");
    expect(html).toContain("bg-background");
  });
});
