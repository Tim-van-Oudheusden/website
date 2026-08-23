import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomeSection } from "./HomeSection";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

function findHomeSection(sectionId: HomeSectionId): HomeSectionDefinition {
  const section = HOME_SECTIONS.find((candidateSection) => candidateSection.id === sectionId);
  if (section === undefined) {
    throw new Error(`Expected ${sectionId} section in homepage config`);
  }

  return section;
}

function renderForYouSection(): string {
  const forYouSection = findHomeSection("for-you");

  return renderToStaticMarkup(
    createElement(HomeSection, { section: forYouSection }),
  );
}

function renderStartSection(): string {
  const startSection = findHomeSection("start");

  return renderToStaticMarkup(
    createElement(HomeSection, { section: startSection }),
  );
}

function renderForDevsSection(): string {
  const forDevsSection = findHomeSection("for-devs");

  return renderToStaticMarkup(
    createElement(HomeSection, { section: forDevsSection }),
  );
}

function renderFooterSection(): string {
  const footerSection = findHomeSection("footer");

  return renderToStaticMarkup(
    createElement(HomeSection, { section: footerSection }),
  );
}

describe("HomeSection", () => {
  test("renders the start section portrait larger, bottom-right anchored, with top-only overflow", () => {
    const html = renderStartSection();

    expect(html).toContain("rounded-[2rem] bg-[var(--site-section-well-bg)]");
    expect(html).toContain("min-h-[29rem]");
    expect(html).toContain("pl-[1.875rem]");
    expect(html).toContain("pr-5");
    expect(html).toContain("sm:pl-12");
    expect(html).toContain("sm:pr-8");
    expect(html).toContain("lg:pl-[2.25rem]");
    expect(html).toContain("lg:pr-6");
    expect(html).toContain("shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]");
    expect(html).toContain("overflow-visible");
    expect(html).toContain("absolute right-0 bottom-0");
    expect(html).toContain("items-end");
    expect(html).toContain("justify-end");
    expect(html).toContain('src="/images/me.png"');
    expect(html).toContain("w-[clamp(14.5rem,29vw,32rem)]");
    expect(html).toContain("rounded-br-[2rem]");
  });

  test("renders for-you well with a tiny inset shadow", () => {
    const html = renderForYouSection();

    expect(html).toContain("shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]");
    expect(html).not.toContain("shadow-[0_28px_65px_-45px_rgba(0,0,0,0.45)]");
  });

  test("uses a shared themed well surface class for start and for-you boxes", () => {
    const startHtml = renderStartSection();
    const forYouHtml = renderForYouSection();

    expect(startHtml).toContain("bg-[var(--site-section-well-bg)]");
    expect(forYouHtml).toContain("bg-[var(--site-section-well-bg)]");
  });

  test("renders non-for-you section text in black for light mode", () => {
    const html = renderStartSection();

    expect(html).toContain("font-bold tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)]");
    expect(html).toContain("leading-[1.55] text-[var(--adw-dark-5)] dark:text-white/80");
    expect(html).toContain('src="/images/me.png"');
  });

  test("uses larger desktop content widths and smaller desktop margins", () => {
    const startHtml = renderStartSection();
    const forYouHtml = renderForYouSection();
    const forDevsHtml = renderForDevsSection();

    expect(startHtml).toContain("px-6 py-12 sm:px-10 sm:py-16 lg:px-6");
    expect(startHtml).toContain("lg:max-w-[74rem]");
    expect(forYouHtml).toContain("px-4 py-12 sm:px-6 sm:py-16 lg:px-4");
    expect(forYouHtml).toContain("max-w-6xl lg:max-w-[83rem]");
    expect(forDevsHtml).toContain("mx-auto");
  });

  test("uses explicit body readability defaults for size, measure, and spacing", () => {
    const html = renderStartSection();

    expect(html).toContain("max-w-[60ch] text-lg sm:text-xl leading-[1.55]");
  });

  test("uses a bold, oversized start hierarchy with a larger Discover CTA", () => {
    const html = renderStartSection();

    expect(html).toContain("font-bold");
    expect(html).toContain("text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem]");
    expect(html).toContain("max-w-[60ch] text-lg sm:text-xl");
    expect(html).toContain("h-14 px-10 text-lg font-semibold");
  });

  test("renders the footer as a semantic footer with site identification", () => {
    const html = renderFooterSection();

    expect(html).toContain('<footer');
    expect(html).toContain("Reboot With Me");
  });

  test("renders a copyright line in the footer", () => {
    const html = renderFooterSection();

    expect(html).toMatch(/©/);
    expect(html).toContain(String(new Date().getFullYear()));
  });

  test("renders a genuine social link (GitHub) without invented channels", () => {
    const html = renderFooterSection();

    expect(html).toContain("https://github.com/Tim-van-Oudheusden/website");
    expect(html).not.toContain("privacy");
    expect(html).not.toContain("terms");
    expect(html).not.toContain("mastodon");
    expect(html).not.toContain("linkedin");
  });
});
