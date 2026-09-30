import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import { HomePage } from "../../../../../../front-end/src/features/home/pages/home-page";

function renderHomePage(): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(HomePage)),
  );
}

describe("HomePage", () => {
  test("mounts every section from HOME_SECTIONS config", () => {
    const html = renderHomePage();

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`id="${section.id}"`);
    }
  });

  test("renders each section heading wired to an aria-labelledby id", () => {
    const html = renderHomePage();

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`aria-labelledby="${section.id}-heading"`);
      expect(html.replaceAll("&#x27;", "'")).toContain(section.heading);
    }
  });

  test("wires the floating nav to the section list", () => {
    const html = renderHomePage();

    expect(html).toContain('aria-label="Page sections"');
    expect(html).toContain('data-slot="active-indicator"');
  });
});