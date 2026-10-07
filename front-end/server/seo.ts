import type { ContentFrontmatter } from "shared";

/** Client routes that exist regardless of content (see App.tsx). */
const STATIC_PAGE_PATHS = ["/", "/articles", "/projects"] as const;

const CONTENT_PAGE_PREFIX: Record<ContentFrontmatter["type"], string> = {
  article: "/articles/",
  project: "/projects/",
};

/** Allow every crawler everywhere and point it at the sitemap. */
export function renderRobotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
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
