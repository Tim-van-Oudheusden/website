import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomeFloatingNav } from "./HomeFloatingNav";

function renderFloatingNav(): string {
  return renderToStaticMarkup(
    createElement(HomeFloatingNav, {
      sections: HOME_SECTIONS,
      activeSectionId: "start",
      onAnchorActivate: () => {},
    }),
  );
}

describe("HomeFloatingNav", () => {
  test("uses the discover-button black for its active indicator highlight", () => {
    const html = renderFloatingNav();

    expect(html).toContain("bg-[var(--adw-dark-5)]");
    expect(html).not.toContain("bg-primary");
  });

  test("matches the homepage background color in dark mode", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:bg-[var(--adw-page-brown-bg)]");
  });
});
