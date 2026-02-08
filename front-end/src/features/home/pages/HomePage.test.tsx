import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  test("renders semantic sections and in-page anchors from HOME_SECTIONS", () => {
    const html = renderToStaticMarkup(createElement(HomePage));

    expect(html).toContain("<main");
    expect(html).toContain("<nav");
    expect(html).toContain("Page sections");

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`id="${section.id}"`);
      expect(html).toContain(`id="${section.id}-heading"`);
      expect(html).toContain(`aria-labelledby="${section.id}-heading"`);
      expect(html).toContain(`href="#${section.id}"`);
    }
  });
});
