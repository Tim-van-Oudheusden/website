import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import { HomeFloatingNav } from "../../../../../../front-end/src/features/home/components/home-floating-nav";

function renderFloatingNav(): string {
  return renderToStaticMarkup(
createElement(HomeFloatingNav, {
       sections: HOME_SECTIONS,
       activeSectionId: "start",
       // eslint-disable-next-line @typescript-eslint/no-empty-function
       onAnchorActivate: () => {},
     }),
  );
}

describe("HomeFloatingNav", () => {
  test("uses the discover-button black for its active indicator highlight", () => {
    const html = renderFloatingNav();

    expect(html).toContain("bg-(--adw-dark-5)");
    expect(html).not.toContain("bg-primary");
  });

  test("uses the section well surface in dark mode to match the light scheme", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:bg-(--site-section-well-bg)");
    expect(html).not.toContain("dark:bg-(--adw-page-brown-bg)");
  });

  test("keeps active nav text white in dark mode while indicator remains black", () => {
    const html = renderFloatingNav();

    expect(html).toContain("dark:text-(--adw-light-1)");
    expect(html).toContain("bg-(--adw-dark-5)");
  });
});
