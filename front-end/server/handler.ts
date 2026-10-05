import { stat } from "node:fs/promises";
import { join } from "node:path";

import type { ContentFrontmatter } from "shared";
import { API_BASE } from "shared";

import { renderSocialMeta } from "./social-meta";

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
 * Production request handler for the front-end: serves the built SPA, and for
 * article URLs injects that article's link-preview tags into index.html.
 */
export function createRequestHandler(options: RequestHandlerOptions): (request: Request) => Promise<Response> {
  const indexFile = Bun.file(join(options.distDir, "index.html"));

  return async (request) => {
    const url = new URL(request.url);

    // url.pathname is already dot-segment normalised and stays percent-encoded,
    // so it cannot climb out of distDir. Do not decode it: "..%2f" would escape.
    const filePath = join(options.distDir, url.pathname);
    const fileStats = await stat(filePath).catch(() => null);

    if (fileStats?.isFile()) {
      return new Response(Bun.file(filePath));
    }

    const indexHtml = await indexFile.text();
    const slug = ARTICLE_PATH.exec(url.pathname)?.[1];
    // The back-end rate-limits per CF-Connecting-IP (trusted from loopback, which
    // we are). Without it every article view would share one bucket (#479).
    const visitorIp = request.headers.get("cf-connecting-ip");
    const backendHeaders: Record<string, string> = visitorIp === null ? {} : { "cf-connecting-ip": visitorIp };
    const article = slug === undefined ? null : await fetchArticle(options.fetchBackend, slug, backendHeaders);

    // cloudflared terminates TLS and reaches us over plain HTTP; it reports the
    // visitor's scheme in X-Forwarded-Proto. Only http/https are honoured.
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const scheme = forwardedProto === "https" || forwardedProto === "http" ? `${forwardedProto}:` : url.protocol;
    const origin = `${scheme}//${url.host}`;

    return new Response(article === null ? indexHtml : renderSocialMeta(indexHtml, article, origin), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
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
