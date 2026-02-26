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
  test("renders for-you white well with a tiny inset shadow", () => {
    const html = renderForYouSection();

    expect(html).toContain("shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]");
    expect(html).not.toContain("shadow-[0_28px_65px_-45px_rgba(0,0,0,0.45)]");
  });

  test("renders non-for-you section text in black for light mode", () => {
    const html = renderStartSection();

    expect(html).toContain("font-semibold tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)]");
    expect(html).toContain("leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80");
    expect(html).toContain("text-sm text-[var(--adw-dark-5)]/50 dark:text-white/50");
  });
});
