import type { ArticleFrontmatter, ContentFrontmatter } from "shared";

import { HERO_LINE, SITE_NAME, SITE_OWNER } from "./social-meta";

/** Client routes that exist regardless of content (see App.tsx). */
const STATIC_PAGE_PATHS = ["/", "/articles", "/projects", "/now", "/uses"] as const;

const CONTENT_PAGE_PREFIX: Record<ContentFrontmatter["type"], string> = {
  article: "/articles/",
  project: "/projects/",
};

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
    return `- [${item.title}](${origin}${CONTENT_PAGE_PREFIX[item.type]}${encodeURIComponent(item.slug)}): ${item.description}`;
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
    "",
    ...section("Articles", "article"),
    ...section("Projects", "project"),
  ].join("\n");
}

/**
 * Sitemap of the fixed pages plus one page per published article and project.
 * `items` is the back-end's content listing, which already leaves out drafts
 * in production.
 */
export function renderSitemap(origin: string, items: readonly ContentFrontmatter[]): string {
  const paths = [
    ...STATIC_PAGE_PATHS,
    ...items.map((item) => `${CONTENT_PAGE_PREFIX[item.type]}${encodeURIComponent(item.slug)}`),
  ];

  const entries = paths
    .map((path) => `  <url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/**
 * Atom 1.0 feed of the published articles, newest first, so readers can
 * subscribe without a newsletter. `items` is the same listing the sitemap uses;
 * projects are left out. An article whose date does not parse is left out too:
 * Atom requires a timestamp on every entry, and a made-up one would misorder it.
 */
export function renderFeed(origin: string, items: readonly ContentFrontmatter[]): string {
  const articles = items
    .filter((item): item is ArticleFrontmatter => item.type === "article")
    .map((article) => ({ article, time: Date.parse(article.date) }))
    .filter(({ time }) => !Number.isNaN(time))
    .sort((left, right) => right.time - left.time);

  // Atom requires a feed-level <updated>; with no articles there is no real date to give.
  const updated = new Date(articles[0]?.time ?? 0).toISOString();

  const entries = articles.map(({ article, time }) => {
    const url = escapeXml(`${origin}${CONTENT_PAGE_PREFIX.article}${encodeURIComponent(article.slug)}`);
    const timestamp = new Date(time).toISOString();

    return [
      "  <entry>",
      `    <id>${url}</id>`,
      `    <title>${escapeXml(article.title)}</title>`,
      `    <link rel="alternate" href="${url}"/>`,
      `    <published>${timestamp}</published>`,
      `    <updated>${timestamp}</updated>`,
      `    <summary>${escapeXml(article.description)}</summary>`,
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
    `  <link rel="self" href="${escapeXml(`${origin}/feed.xml`)}"/>`,
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
