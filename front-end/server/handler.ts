import { stat } from "node:fs/promises";
import { join } from "node:path";

import type { ContentFrontmatter } from "shared";
import { API_BASE, CF_CONNECTING_IP_HEADER, ROUTES } from "shared";

import { renderRobotsTxt, renderSitemap } from "./seo";
import { renderHomeMeta, renderSocialMeta } from "./social-meta";

export interface RequestHandlerOptions {
  /** Directory holding the Vite build output (index.html + assets). */
  distDir: string;
  /**
   * Fetches a back-end path such as `/api/content/<slug>` with the given
   * request headers (the visitor's CF-Connecting-IP, when known).
   */
  fetchBackend: (path: string, headers: Record<string, string>) => Promise<Response>;
}

const ARTICLE_PATH = /^\/articles\/([^/]+)\/?$/;

/**
 * The same baseline @fastify/helmet gives the back-end (security-headers.ts):
 * cloudflared routes every page to this server, not to Fastify.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
};

/**
 * Production request handler for the front-end: serves the built SPA, and for
 * article URLs injects that article's link-preview tags into index.html, and
 * the homepage gets its description, canonical URL and preview tags. It
 * also answers /robots.txt and /sitemap.xml, which cloudflared routes here.
 */
export function createRequestHandler(options: RequestHandlerOptions): (request: Request) => Promise<Response> {
  const indexFile = Bun.file(join(options.distDir, "index.html"));

  return async (request) => {
    const url = new URL(request.url);
    // The back-end rate-limits per CF-Connecting-IP (trusted from loopback, which
    // we are). Without it every article view would share one bucket (#479).
    const visitorIp = request.headers.get(CF_CONNECTING_IP_HEADER);
    const backendHeaders: Record<string, string> = visitorIp === null ? {} : { [CF_CONNECTING_IP_HEADER]: visitorIp };

    if (url.pathname === "/robots.txt") {
      return new Response(renderRobotsTxt(requestOrigin(request, url)), {
        headers: { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/sitemap.xml") {
      const items = await fetchContentList(options.fetchBackend, backendHeaders);

      return new Response(renderSitemap(requestOrigin(request, url), items), {
        headers: { ...SECURITY_HEADERS, "content-type": "application/xml; charset=utf-8" },
      });
    }

    // url.pathname is already dot-segment normalised and stays percent-encoded,
    // so it cannot climb out of distDir. Do not decode it: "..%2f" would escape.
    const filePath = join(options.distDir, url.pathname);
    const fileStats = await stat(filePath).catch(() => null);

    if (fileStats?.isFile()) {
      return new Response(Bun.file(filePath), { headers: SECURITY_HEADERS });
    }

    const indexHtml = await indexFile.text();
    const slug = ARTICLE_PATH.exec(url.pathname)?.[1];
    const article = slug === undefined ? null : await fetchArticle(options.fetchBackend, slug, backendHeaders);

    const origin = requestOrigin(request, url);
    let html = indexHtml;

    if (article !== null) {
      html = renderSocialMeta(indexHtml, article, origin);
    } else if (url.pathname === "/") {
      html = renderHomeMeta(indexHtml, origin);
    }

    return new Response(html, {
      headers: { ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8" },
    });
  };
}

/**
 * The origin the visitor used. cloudflared terminates TLS and reaches us over
 * plain HTTP; it reports the visitor's scheme in X-Forwarded-Proto. Only
 * http/https are honoured.
 */
function requestOrigin(request: Request, url: URL): string {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const scheme = forwardedProto === "https" || forwardedProto === "http" ? `${forwardedProto}:` : url.protocol;

  return `${scheme}//${url.host}`;
}

/**
 * List published content for the sitemap. Any failure yields an empty list:
 * the sitemap then still names the fixed pages instead of erroring.
 */
async function fetchContentList(
  fetchBackend: RequestHandlerOptions["fetchBackend"],
  headers: Record<string, string>,
): Promise<ContentFrontmatter[]> {
  try {
    const response = await fetchBackend(`${API_BASE}${ROUTES.CONTENT}`, headers);

    if (!response.ok) {
      return [];
    }

    const items = await response.json() as ContentFrontmatter[];

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/**
 * Look up an article for its preview tags. Any miss (unknown slug, a project
 * slug, back-end down) yields null: the page must load regardless, so the
 * caller falls back to the plain app shell.
 */
async function fetchArticle(
  fetchBackend: RequestHandlerOptions["fetchBackend"],
  slug: string,
  headers: Record<string, string>,
): Promise<ContentFrontmatter | null> {
  try {
    const response = await fetchBackend(`${API_BASE}/content/${slug}`, headers);

    if (!response.ok) {
      return null;
    }

    const item = await response.json() as ContentFrontmatter;

    return item.type === "article" ? item : null;
  } catch {
    return null;
  }
}
