import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeSection } from "./HomeSection";
import type { HomeSectionDefinition } from "../types/home-section";

const COLUMN_SECTION: HomeSectionDefinition = {
  id: "hero",
  label: "Hero",
  heading: "Test Heading",
  body: "Test body text",
  bgColor: "var(--adw-accent-blue)",
  contentDirection: "column",
};

const ROW_SECTION: HomeSectionDefinition = {
  id: "value-pillars",
  label: "Value Pillars",
  heading: "Row Heading",
  body: "Row body text",
  bgColor: "var(--adw-accent-teal)",
  contentDirection: "row",
};

describe("HomeSection", () => {
  test("renders a semantic section with full-viewport height", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("<section");
    expect(html).toContain('id="hero"');
    expect(html).toContain('aria-labelledby="hero-heading"');
    expect(html).toContain("min-h-svh");
  });

  test("does not add anchor scroll top offset that reveals part of the previous section", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).not.toContain("scroll-mt-20");
  });

  test("applies background color from section config as inline style", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("background-color:var(--adw-accent-blue)");
  });

  test("does not render card-style border or rounded styling", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).not.toContain("rounded-3xl");
    expect(html).not.toContain("bg-card");
  });

  test("renders section heading and body text", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("Test Heading");
    expect(html).toContain("Test body text");
    expect(html).toContain('id="hero-heading"');
  });

  test("column section uses flex-col for the content container", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("flex-col");
  });

  test("row section uses md:flex-row for side-by-side layout on wider screens", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: ROW_SECTION }));
    expect(html).toContain("md:flex-row");
  });

  test("row section still defaults to column on small screens", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: ROW_SECTION }));
    expect(html).toContain("flex-col");
  });

  test("content container uses responsive max-width", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("max-w-2xl");
    expect(html).toContain("md:max-w-3xl");
    expect(html).toContain("lg:max-w-5xl");
  });

  test("hero section uses enlarged heading typography", () => {
    const html = renderToStaticMarkup(createElement(HomeSection, { section: COLUMN_SECTION }));
    expect(html).toContain("text-4xl");
    expect(html).toContain("sm:text-5xl");
  });
});
