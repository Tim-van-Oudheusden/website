import { describe, expect, test } from "bun:test";

import type { ArticleFrontmatter } from "shared";

import { renderSitemap } from "../../../front-end/server/seo";

const ARTICLE: ArticleFrontmatter = {
  type: "article",
  title: "Rock & roll",
  description: "",
  date: "2026-09-01",
  tags: [],
  draft: false,
  homeRecommended: false,
  category: "Personal Life",
  slug: "rock-&-<roll>",
  socialImage: null,
};

describe("renderSitemap", () => {
  test("percent-encodes slugs so authored characters cannot break the XML", () => {
    const xml = renderSitemap("https://buildwithtim.dev", [ARTICLE]);

    expect(xml).toContain("<loc>https://buildwithtim.dev/articles/rock-%26-%3Croll%3E</loc>");
    expect(xml).not.toContain("<roll>");
  });

  test("XML-escapes an apostrophe, which percent-encoding leaves in the slug", () => {
    const xml = renderSitemap("https://buildwithtim.dev", [{ ...ARTICLE, slug: "tim's-notes" }]);

    expect(xml).toContain("<loc>https://buildwithtim.dev/articles/tim&apos;s-notes</loc>");
  });

  test("is a sitemaps.org urlset document", () => {
    const xml = renderSitemap("https://buildwithtim.dev", []);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });
});
