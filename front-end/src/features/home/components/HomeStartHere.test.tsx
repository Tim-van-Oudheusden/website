import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { StartHereLinks, resolveStartHere, HOME_START_HERE_SLUGS } from "./HomeStartHere";
import type { ArticleSummary } from "@/features/articles/articles-sidebar";

const FIXTURE_ARTICLES: ArticleSummary[] = [
  {
    title: "My operating system is a container image, yes, really",
    slug: "my-operating-system-is-a-container-image-yes-really",
    date: "2026-01-01",
    tags: ["Linux"],
    type: "article",
    draft: false,
    category: "Linux",
    description: "A container desktop.",
  },
  {
    title: "Introduction",
    slug: "introduction",
    date: "2026-02-02",
    tags: [],
    type: "article",
    draft: false,
    category: "Introduction",
    description: "About the site.",
  },
  {
    title: "Yoga Nidra",
    slug: "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    date: "2026-03-03",
    tags: ["Personal Life"],
    type: "article",
    draft: false,
    category: "Personal Life",
    description: "Rest at peace.",
  },
];

function renderStartHere(items: ArticleSummary[]): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(StartHereLinks, { items })),
  );
}

describe("resolveStartHere", () => {
  test("keeps only curated slugs and preserves their stated order", () => {
    const result = resolveStartHere(FIXTURE_ARTICLES, HOME_START_HERE_SLUGS);

    expect(result.map((a) => a.slug)).toEqual([
      "introduction",
      "my-operating-system-is-a-container-image-yes-really",
      "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    ]);
  });

  test("skips curated slugs that do not exist in the content", () => {
    const result = resolveStartHere(FIXTURE_ARTICLES, [
      "introduction",
      "no-such-post",
      "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    ]);

    expect(result.map((a) => a.slug)).toEqual([
      "introduction",
      "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    ]);
  });
});

describe("StartHereLinks", () => {
  test("renders each curated title as a link to its real article page", () => {
    const html = renderStartHere(resolveStartHere(FIXTURE_ARTICLES, HOME_START_HERE_SLUGS));

    expect(html).toContain("/articles/introduction");
    expect(html).toContain("/articles/my-operating-system-is-a-container-image-yes-really");
    expect(html).toContain("Introduction");
    expect(html).toContain("My operating system is a container image, yes, really");
  });

  test("renders only real links, no invented newsletter or shop CTA", () => {
    const html = renderStartHere(resolveStartHere(FIXTURE_ARTICLES, HOME_START_HERE_SLUGS));

    expect(html).not.toMatch(/newsletter/i);
    expect(html).not.toMatch(/shop/i);
    expect(html).not.toMatch(/subscribe/i);
  });
});