import { describe, expect, test } from "bun:test";

import type { ArticleFrontmatter, ProjectFrontmatter } from "shared";
import { STANDALONE_PAGE_SLUGS } from "shared";

import { renderFeed, renderSitemap } from "../../../front-end/server/seo";

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

  test("dates each article and project by its updated day, else its publication date", () => {
    const xml = renderSitemap("https://buildwithtim.dev", [
      { ...ARTICLE, slug: "unchanged" },
      { ...ARTICLE, slug: "rewritten", updated: "2026-10-26" },
    ]);

    expect(xml).toContain("<loc>https://buildwithtim.dev/articles/unchanged</loc><lastmod>2026-09-01</lastmod>");
    expect(xml).toContain("<loc>https://buildwithtim.dev/articles/rewritten</loc><lastmod>2026-10-26</lastmod>");
  });

  test("gives the fixed pages no lastmod, having no date to report", () => {
    const xml = renderSitemap("https://buildwithtim.dev", []);

    expect(xml).toContain("<url><loc>https://buildwithtim.dev/</loc></url>");
    expect(xml).not.toContain("<lastmod>");
  });

  test("lists every fixed page, including every standalone page, even with no content", () => {
    const xml = renderSitemap("https://buildwithtim.dev", []);

    expect(xml).toContain("<loc>https://buildwithtim.dev/</loc>");
    expect(xml).toContain("<loc>https://buildwithtim.dev/articles</loc>");
    expect(xml).toContain("<loc>https://buildwithtim.dev/projects</loc>");
    expect(xml).toContain("<loc>https://buildwithtim.dev/agentic</loc>");

    for (const slug of STANDALONE_PAGE_SLUGS) {
      expect(xml).toContain(`<loc>https://buildwithtim.dev/${slug}</loc>`);
    }
  });
});

describe("renderFeed", () => {
  const ORIGIN = "https://buildwithtim.dev";

  function entryIds(xml: string): string[] {
    return [...xml.matchAll(/<entry>[\s\S]*?<id>([^<]*)<\/id>/g)].map((match) => match[1] ?? "");
  }

  test("is an Atom 1.0 feed that names the site, its author and its own URL", () => {
    const xml = renderFeed(ORIGIN, [ARTICLE]);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">')).toBe(true);
    expect(xml.trimEnd().endsWith("</feed>")).toBe(true);
    expect(xml).toContain("<title>Build with Tim</title>");
    expect(xml).toContain("<author><name>Tim van Oudheusden</name></author>");
    expect(xml).toContain('<link rel="self" href="https://buildwithtim.dev/feed.xml"/>');
    expect(xml).toContain('<link rel="alternate" href="https://buildwithtim.dev/"/>');
  });

  function projectOn(slug: string, date: string): ProjectFrontmatter {
    return {
      type: "project",
      title: "Launcher",
      description: "",
      date,
      tags: [],
      draft: false,
      slug,
      socialImage: null,
      coverImage: "",
      coverImageAlt: "",
      featured: false,
      projectOrder: 0,
      prioritySlot: null,
      status: null,
      role: null,
      created: null,
      links: [],
      info: null,
    };
  }

  test("lists projects among articles in date order, each with its own URL", () => {
    const older = { ...ARTICLE, slug: "older", date: "2026-01-15" };
    const newer = { ...ARTICLE, slug: "newer", date: "2026-08-20" };
    const project = projectOn("launcher", "2026-05-01");

    const xml = renderFeed(ORIGIN, [older, project, newer]);

    expect(entryIds(xml)).toEqual([`${ORIGIN}/articles/newer`, `${ORIGIN}/projects/launcher`, `${ORIGIN}/articles/older`]);
  });

  test("dates the feed by its newest entry when that entry is a project", () => {
    const xml = renderFeed(ORIGIN, [{ ...ARTICLE, date: "2026-02-08" }, projectOn("launcher", "2026-11-05")]);

    expect(xml.slice(0, xml.indexOf("<entry>"))).toContain("<updated>2026-11-05T00:00:00.000Z</updated>");
  });

  test("drops a project whose date cannot be read, like an article", () => {
    const xml = renderFeed(ORIGIN, [projectOn("dated", "2026-05-01"), projectOn("undated", "someday")]);

    expect(entryIds(xml)).toEqual([`${ORIGIN}/projects/dated`]);
  });

  test("stamps entries and the feed with RFC 3339 times taken from the article dates", () => {
    const xml = renderFeed(ORIGIN, [
      { ...ARTICLE, slug: "older", date: "2026-01-15" },
      { ...ARTICLE, slug: "newer", date: "2026-08-20" },
    ]);

    expect(xml).toContain("<published>2026-01-15T00:00:00.000Z</published>");
    expect(xml).toContain("<updated>2026-01-15T00:00:00.000Z</updated>");
    expect(xml.indexOf("<updated>2026-08-20T00:00:00.000Z</updated>")).toBeLessThan(xml.indexOf("<entry>"));
  });

  test("stamps a rewritten entry's updated with its updated day, keeping its id and published date", () => {
    const xml = renderFeed(ORIGIN, [{ ...ARTICLE, slug: "rewritten", date: "2026-06-10", updated: "2026-10-26" }]);
    const entry = xml.slice(xml.indexOf("<entry>"));

    expect(entry).toContain(`<id>${ORIGIN}/articles/rewritten</id>`);
    expect(entry).toContain("<published>2026-06-10T00:00:00.000Z</published>");
    expect(entry).toContain("<updated>2026-10-26T00:00:00.000Z</updated>");
  });

  test("keeps entries in publication order when an older entry was updated later", () => {
    const xml = renderFeed(ORIGIN, [
      { ...projectOn("launcher", "2026-06-10"), updated: "2026-11-05" },
      { ...ARTICLE, slug: "newer", date: "2026-08-20" },
    ]);

    expect(entryIds(xml)).toEqual([`${ORIGIN}/articles/newer`, `${ORIGIN}/projects/launcher`]);
  });

  test("dates the feed by the newest change, even when it is to an older entry", () => {
    const xml = renderFeed(ORIGIN, [
      { ...projectOn("launcher", "2026-06-10"), updated: "2026-11-05" },
      { ...ARTICLE, slug: "newer", date: "2026-08-20", updated: null },
    ]);

    expect(xml.slice(0, xml.indexOf("<entry>"))).toContain("<updated>2026-11-05T00:00:00.000Z</updated>");
  });

  test("drops an article whose date cannot be read rather than inventing one", () => {
    const xml = renderFeed(ORIGIN, [{ ...ARTICLE, slug: "dated" }, { ...ARTICLE, slug: "undated", date: "someday" }]);

    expect(entryIds(xml)).toEqual([`${ORIGIN}/articles/dated`]);
  });

  test("escapes authored titles and descriptions so they cannot break the XML", () => {
    const xml = renderFeed(ORIGIN, [{ ...ARTICLE, slug: "rock", description: "Bits <b>& pieces</b>" }]);

    expect(xml).toContain("<title>Rock &amp; roll</title>");
    expect(xml).toContain("<summary>Bits &lt;b&gt;&amp; pieces&lt;/b&gt;</summary>");
    expect(xml).toContain('<link rel="alternate" href="https://buildwithtim.dev/articles/rock"/>');
  });
});
