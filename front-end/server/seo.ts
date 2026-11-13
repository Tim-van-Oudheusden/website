import type { ContentFrontmatter } from "shared";
import { AGENTIC_PAGE_PATH, FEED_PATH, HERO_LINE, SITE_NAME, SITE_OWNER, STANDALONE_PAGE_SLUGS } from "shared";

import { contentPagePath, lastModified } from "./social-meta";

/**
 * Client routes that exist regardless of content (see App.tsx). The
 * standalone pages come from `STANDALONE_PAGE_SLUGS` so this list can never
 * drift from the routes App.tsx actually registers for them.
 */
const STATIC_PAGE_PATHS = [
  "/",
  "/articles",
  "/projects",
  AGENTIC_PAGE_PATH,
  ...STANDALONE_PAGE_SLUGS.map((slug) => `/${slug}`),
] as const;

/** Allow every crawler everywhere and point it at the sitemap. */
export function renderRobotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}

/**
 * llms.txt (llmstxt.org): a Markdown index of the site for AI assistants.
 * Fixed sections first, then every published article and project from the same
 * content listing the sitemap uses.
 */
export function renderLlmsTxt(origin: string, items: readonly ContentFrontmatter[]): string {
  function link(item: ContentFrontmatter): string {
    return `- [${item.title}](${origin}${contentPagePath(item)}): ${item.description}`;
  }

  function section(heading: string, type: ContentFrontmatter["type"]): string[] {
    const entries = items.filter((item) => item.type === type).map(link);

    return entries.length === 0 ? [] : [`## ${heading}`, "", ...entries, ""];
  }

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${HERO_LINE}`,
    "",
    "## Sections",
    "",
    `- [Home](${origin}/)`,
    `- [Articles](${origin}/articles)`,
    `- [Projects](${origin}/projects)`,
    `- [Agentic](${origin}${AGENTIC_PAGE_PATH})`,
    "",
    ...section("Articles", "article"),
    ...section("Projects", "project"),
  ].join("\n");
}

/**
 * Sitemap of the fixed pages plus one page per published article and project.
 * `items` is the back-end's content listing, which already leaves out drafts
 * in production. Each article and project carries a `<lastmod>`, so crawlers
 * see when a page was rewritten; the fixed pages have no date to give.
 */
export function renderSitemap(origin: string, items: readonly ContentFrontmatter[]): string {
  const urls = [
    ...STATIC_PAGE_PATHS.map((path) => ({ path, lastmod: null })),
    ...items.map((item) => ({ path: contentPagePath(item), lastmod: lastModified(item) })),
  ];

  const entries = urls
    .map(({ path, lastmod }) => {
      const loc = `<loc>${escapeXml(`${origin}${path}`)}</loc>`;

      return lastmod === null
        ? `  <url>${loc}</url>`
        : `  <url>${loc}<lastmod>${escapeXml(lastmod)}</lastmod></url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/**
 * Atom 1.0 feed of the published articles and projects, newest first, so
 * readers can subscribe without a newsletter. `items` is the same listing the
 * sitemap uses. An item whose date does not parse is left out: Atom requires a
 * timestamp on every entry, and a made-up one would misorder it. Entries are
 * ordered by `date`, so a rewrite does not move an old item to the top; their
 * `<updated>` is `updated ?? date`, so feed readers still see the rewrite.
 */
export function renderFeed(origin: string, items: readonly ContentFrontmatter[]): string {
  const dated = items
    .map((item) => {
      const time = Date.parse(item.date);
      const modified = Date.parse(lastModified(item));

      return { item, time, modified: Number.isNaN(modified) ? time : modified };
    })
    .filter(({ time }) => !Number.isNaN(time))
    .sort((left, right) => right.time - left.time);

  // Atom requires a feed-level <updated>: the newest entry change. With no entries there is no real date to give.
  const updated = new Date(Math.max(0, ...dated.map(({ modified }) => modified))).toISOString();

  const entries = dated.map(({ item, time, modified }) => {
    const url = escapeXml(`${origin}${contentPagePath(item)}`);

    return [
      "  <entry>",
      `    <id>${url}</id>`,
      `    <title>${escapeXml(item.title)}</title>`,
      `    <link rel="alternate" href="${url}"/>`,
      `    <published>${new Date(time).toISOString()}</published>`,
      `    <updated>${new Date(modified).toISOString()}</updated>`,
      `    <summary>${escapeXml(item.description)}</summary>`,
      "  </entry>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXml(`${origin}/`)}</id>`,
    `  <title>${escapeXml(SITE_NAME)}</title>`,
    `  <updated>${updated}</updated>`,
    `  <author><name>${escapeXml(SITE_OWNER)}</name></author>`,
    `  <link rel="self" href="${escapeXml(`${origin}${FEED_PATH}`)}"/>`,
    `  <link rel="alternate" href="${escapeXml(`${origin}/`)}"/>`,
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}

function escapeXml(text: string): string {
  return text.replace(/[&"'<>]/g, (character) => XML_ESCAPES[character] ?? character);
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
  "<": "&lt;",
  ">": "&gt;",
};
