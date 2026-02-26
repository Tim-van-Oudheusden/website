import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomeSection } from "./HomeSection";

function renderForYouSection(): string {
  const forYouSection = HOME_SECTIONS.find((section) => section.id === "for-you");
  if (forYouSection == null) {
    throw new Error("Expected for-you section in homepage config");
  }

  return renderToStaticMarkup(
    createElement(HomeSection, { section: forYouSection }),
  );
}

function renderStartSection(): string {
  const startSection = HOME_SECTIONS.find((section) => section.id === "start");
  if (startSection == null) {
    throw new Error("Expected start section in homepage config");
  }

  return renderToStaticMarkup(
    createElement(HomeSection, { section: startSection }),
  );
}

describe("HomeSection", () => {
  test("renders the start section inside a white well with an overflow portrait image", () => {
    const html = renderStartSection();

    expect(html).toContain("rounded-[2rem] bg-white");
    expect(html).toContain("shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]");
    expect(html).toContain('src="/images/me.png"');
    expect(html).toContain("Portrait of Tim van Oudheusden");
    expect(html).toContain("-mt-8 sm:-mt-10");
  });

  test("renders for-you white well with a tiny inset shadow", () => {
    const html = renderForYouSection();

    expect(html).toContain("shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]");
    expect(html).not.toContain("shadow-[0_28px_65px_-45px_rgba(0,0,0,0.45)]");
  });

  test("renders non-for-you section text in black for light mode", () => {
    const html = renderStartSection();

    expect(html).toContain("font-semibold tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)]");
    expect(html).toContain("leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80");
    expect(html).toContain('src="/images/me.png"');
  });

  test("uses larger desktop content widths and smaller desktop margins", () => {
    const startHtml = renderStartSection();
    const forYouHtml = renderForYouSection();

    expect(startHtml).toContain("px-6 py-12 sm:px-10 sm:py-16 lg:px-6");
    expect(startHtml).toContain("lg:max-w-[74rem]");
    expect(forYouHtml).toContain("px-4 py-12 sm:px-6 sm:py-16 lg:px-4");
    expect(forYouHtml).toContain("max-w-6xl lg:max-w-[83rem]");
  });

  test("uses explicit body readability defaults for size, measure, and spacing", () => {
    const html = renderStartSection();

    expect(html).toContain("max-w-[65ch] text-base sm:text-lg leading-relaxed");
  });

  test("uses a clear section heading step for scan hierarchy", () => {
    const html = renderStartSection();

    expect(html).toContain("text-[1.75rem] sm:text-[2rem]");
    expect(html).not.toContain("text-2xl sm:text-3xl");
  });
});
