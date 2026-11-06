import { stat } from "node:fs/promises";
import { join } from "node:path";

import type { ContentFrontmatter, HealthCheckResponse, PageData } from "shared";
import {
  AGENTIC_INTRO,
  AGENTIC_PAGE_PATH,
  API_BASE,
  APP_NAME,
  CF_CONNECTING_IP_HEADER,
  DEFAULT_ARTICLE_SLUG,
  FEED_PATH,
  PROJECTS_DESCRIPTION,
  ROUTES,
  STANDALONE_PAGE_SLUGS,
} from "shared";

import { renderFeed, renderLlmsTxt, renderRobotsTxt, renderSitemap } from "./seo";
import type { PageHead } from "./social-meta";
import { CONTENT_PAGE_PREFIX, renderHomeMeta, renderNotFoundMeta, renderPageMeta, renderSocialMeta } from "./social-meta";

export interface RequestHandlerOptions {
  /** Directory holding the Vite build output (index.html + assets). */
  distDir: string;
  /**
   * Fetches a back-end path such as `/api/content/<slug>` with the given
   * request headers (the visitor's CF-Connecting-IP, when known).
   */
  fetchBackend: (path: string, headers: Record<string, string>) => Promise<Response>;
  /**
   * Told about each back-end lookup that could not be completed (refused, timed
   * out, non-OK status). The page is still served, so without this an outage
   * only shows as missing previews. `lookup` is a fixed name; `reason` is the
   * status code or error, never the visitor's path or headers.
   */
  onBackendUnavailable: (lookup: BackendLookup, reason: string) => void;
}

/** Which back-end lookup could not be completed. */
export type BackendLookup = "content item" | "content list" | "page";

/** The back-end's answer for a slug; `unavailable` when it could not say (down, rate-limited, …). */
type ContentLookup
  = | { status: "found"; item: ContentFrontmatter }
    | { status: "missing" }
    | { status: "unavailable" };

/** Article and project pages. Like React Router, it ignores case and a trailing slash. */
const CONTENT_PATH = /^(\/(?:articles|projects)\/)([^/]+)\/?$/i;

/**
 * Every other route in App.tsx's AppRoutes, matched the same way. Any path
 * outside these and CONTENT_PATH renders the client's not-found page.
 */
const APP_ROUTE = new RegExp(
  `^/(?:articles|projects|${AGENTIC_PAGE_PATH.slice(1)}|tags/[^/]+|${STANDALONE_PAGE_SLUGS.join("|")})?/?$`,
  "i",
);

/** Fixed pages whose head text ships with the app, so it needs no back-end lookup. */
const STATIC_PAGE_HEADS: readonly PageHead[] = [
  { path: AGENTIC_PAGE_PATH, title: "Agentic", description: AGENTIC_INTRO },
  { path: "/projects", title: "Projects", description: PROJECTS_DESCRIPTION },
];

/**
 * Framing and MIME-sniffing protection, with the values @fastify/helmet gives
 * the back-end (security-headers.ts): cloudflared routes every page to this
 * server, not to Fastify. Only these two: helmet's other headers, such as
 * `Referrer-Policy: no-referrer`, are not sent here.
 */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
};

/**
 * Production request handler for the front-end: serves the built SPA, and for
 * article and project URLs injects that item's link-preview tags into
 * index.html. The homepage and the other fixed pages (/agentic, /articles, …)
 * get their title, description, canonical URL and preview tags. It
 * also answers /robots.txt, /llms.txt, /sitemap.xml and /feed.xml, which cloudflared
 * routes here.
 */
export function createRequestHandler(options: RequestHandlerOptions): (request: Request) => Promise<Response> {
  const indexFile = Bun.file(join(options.distDir, "index.html"));

  return async (request) => {
    const url = new URL(request.url);
    // The back-end rate-limits per CF-Connecting-IP (trusted from loopback, which
    // we are). Without it every article view would share one bucket (#479).
    const visitorIp = request.headers.get(CF_CONNECTING_IP_HEADER);
    const backendHeaders: Record<string, string> = visitorIp === null ? {} : { [CF_CONNECTING_IP_HEADER]: visitorIp };

    if (url.pathname === ROUTES.HEALTH) {
      const body = await checkHealth(indexFile);

      return Response.json(body, { status: body.status === "ok" ? 200 : 503, headers: SECURITY_HEADERS });
    }

    if (url.pathname === "/robots.txt") {
      return new Response(renderRobotsTxt(requestOrigin(request, url)), {
        headers: { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/llms.txt") {
      const items = await fetchContentList(options, backendHeaders) ?? [];

      return new Response(renderLlmsTxt(requestOrigin(request, url), items), {
        headers: { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname === "/sitemap.xml") {
      const items = await fetchContentList(options, backendHeaders) ?? [];

      return new Response(renderSitemap(requestOrigin(request, url), items), {
        headers: { ...SECURITY_HEADERS, "content-type": "application/xml; charset=utf-8" },
      });
    }

    if (url.pathname === FEED_PATH) {
      const items = await fetchContentList(options, backendHeaders);

      // An empty feed would read as "no entries"; a 503 tells feed readers to retry.
      if (items === null) {
        return new Response("Feed temporarily unavailable", {
          status: 503,
          headers: { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" },
        });
      }

      return new Response(renderFeed(requestOrigin(request, url), items), {
        headers: { ...SECURITY_HEADERS, "content-type": "application/atom+xml; charset=utf-8" },
      });
    }

    // url.pathname is already dot-segment normalised and stays percent-encoded,
    // so it cannot climb out of distDir. Do not decode it: "..%2f" would escape.
    const filePath = join(options.distDir, url.pathname);
    const fileStats = await stat(filePath).catch(() => null);

    if (fileStats?.isFile()) {
      return new Response(Bun.file(filePath), { headers: SECURITY_HEADERS });
    }

    // Browsers probe /favicon.ico regardless of <link rel="icon">; the app shell
    // is not an icon. Only this path: article slugs may contain dots, so a
    // general "has an extension" 404 would break real pages.
    if (url.pathname === "/favicon.ico") {
      return new Response("Not Found", {
        status: 404,
        headers: { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" },
      });
    }

    const indexHtml = await indexFile.text();
    const origin = requestOrigin(request, url);
    const [, pagePrefix, slug] = CONTENT_PATH.exec(url.pathname) ?? [];
    let html = indexHtml;
    let status = 200;

    if (pagePrefix !== undefined && slug !== undefined) {
      const lookup = await fetchContentItem(options, slug, backendHeaders);

      // A slug under the other section (/articles/<project slug>) is not a real page there.
      // When the back-end cannot say, serve a plain 200: an outage must not de-index real pages.
      if (lookup.status === "found" && CONTENT_PAGE_PREFIX[lookup.item.type] === pagePrefix.toLowerCase()) {
        html = renderSocialMeta(indexHtml, lookup.item, origin);
      } else if (lookup.status !== "unavailable") {
        status = 404;
      }
    } else if (url.pathname === "/") {
      html = renderHomeMeta(indexHtml, origin);
    } else if (APP_ROUTE.test(url.pathname)) {
      // Like the router: one page whatever its case or trailing slash, so one canonical URL.
      const head = await fixedPageHead(options, url.pathname.toLowerCase().replace(/\/$/, ""), backendHeaders);

      // Without its text (back-end down, page missing) the plain shell still serves the page.
      if (head !== null) {
        html = renderPageMeta(indexHtml, head, origin);
      }
    } else {
      status = 404;
    }

    return new Response(status === 404 ? renderNotFoundMeta(html) : html, {
      status,
      headers: { ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8" },
    });
  };
}

/**
 * Every response this server sends for a real page comes from `indexFile`
 * (the SPA shell); a missing or unreadable `dist/index.html` means every
 * visitor request already fails, not just this check. Mirrors the back-end's
 * `contentDir` probe (features/health/register-health-route.ts) so neither
 * container can report "ok" while unable to serve its one real dependency.
 */
async function checkHealth(indexFile: ReturnType<typeof Bun.file>): Promise<HealthCheckResponse> {
  const uptime = Math.round(process.uptime());

  if (await indexFile.exists()) {
    return { status: "ok", name: APP_NAME, uptime, error: null };
  }

  return { status: "error", name: APP_NAME, uptime, error: "built site (dist/index.html) is not accessible" };
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
 * List published content for the sitemap and feed. Any failure yields null:
 * the sitemap then still names the fixed pages, and the feed answers 503.
 */
async function fetchContentList(
  options: RequestHandlerOptions,
  headers: Record<string, string>,
): Promise<ContentFrontmatter[] | null> {
  try {
    const response = await options.fetchBackend(`${API_BASE}${ROUTES.CONTENT}`, headers);

    if (!response.ok) {
      options.onBackendUnavailable("content list", `status ${response.status}`);

      return null;
    }

    const items = await response.json() as ContentFrontmatter[];

    return Array.isArray(items) ? items : null;
  } catch (error) {
    options.onBackendUnavailable("content list", describeError(error));

    return null;
  }
}

/**
 * Look up an article or project for its preview tags and status code. Only a
 * back-end 404 means the slug is unknown; any other failure (back-end down,
 * rate-limited) is `unavailable`, and the page must load regardless.
 */
async function fetchContentItem(
  options: RequestHandlerOptions,
  slug: string,
  headers: Record<string, string>,
): Promise<ContentLookup> {
  try {
    // `slug` comes straight from url.pathname, so it is still percent-encoded;
    // unlike the client loaders, encoding it again would double-encode it.
    const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", slug);
    const response = await options.fetchBackend(`${API_BASE}${path}`, headers);

    if (response.status === 404) {
      return { status: "missing" };
    }

    if (!response.ok) {
      options.onBackendUnavailable("content item", `status ${response.status}`);

      return { status: "unavailable" };
    }

    return { status: "found", item: await response.json() as ContentFrontmatter };
  } catch (error) {
    options.onBackendUnavailable("content item", describeError(error));

    return { status: "unavailable" };
  }
}

/**
 * The head for a fixed page, or null when it has none or the back-end cannot
 * give its text. /articles shows the introduction article by default, so that
 * article's description is the page's; /now and /uses carry their own
 * frontmatter title and description.
 */
async function fixedPageHead(
  options: RequestHandlerOptions,
  path: string,
  headers: Record<string, string>,
): Promise<PageHead | null> {
  const staticHead = STATIC_PAGE_HEADS.find((head) => head.path === path);

  if (staticHead !== undefined) {
    return staticHead;
  }

  if (path === "/articles") {
    const lookup = await fetchContentItem(options, DEFAULT_ARTICLE_SLUG, headers);

    return lookup.status === "found" ? { path, title: "Articles", description: lookup.item.description } : null;
  }

  const slug = STANDALONE_PAGE_SLUGS.find((pageSlug) => `/${pageSlug}` === path);
  const page = slug === undefined ? null : await fetchPage(options, slug, headers);

  return page === null ? null : { path, title: page.title, description: page.description };
}

/**
 * Look up a standalone page for its head. Null when the back-end has no such
 * page (404) or cannot answer; only the latter is reported.
 */
async function fetchPage(
  options: RequestHandlerOptions,
  slug: string,
  headers: Record<string, string>,
): Promise<PageData | null> {
  try {
    const response = await options.fetchBackend(`${API_BASE}${ROUTES.PAGE_BY_SLUG.replace(":slug", slug)}`, headers);

    if (response.ok) {
      return await response.json() as PageData;
    }

    if (response.status !== 404) {
      options.onBackendUnavailable("page", `status ${response.status}`);
    }

    return null;
  } catch (error) {
    options.onBackendUnavailable("page", describeError(error));

    return null;
  }
}

/** `TimeoutError: …` for the fetch timeout in main.ts, `Error: connect ECONNREFUSED …` when the back-end is down. */
function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
