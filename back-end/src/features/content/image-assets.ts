import { extname } from "path";

import { resolveWithinRoot } from "../../core/safe-fs";

/**
 * Single source of truth for content asset extensions and their MIME types.
 * Everything that needs the extension list or a MIME lookup derives from this
 * map so the two can never drift apart.
 */
export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export const IMAGE_EXTENSIONS: readonly string[] = Object.keys(IMAGE_MIME_TYPES);

/**
 * Asset filenames are authored content paths, not content-hashed build output,
 * so an image edited in place keeps its URL. Caches may reuse an image for an
 * hour, then must revalidate it against its ETag (#829).
 */
export const ASSET_CACHE_CONTROL = "public, max-age=3600";

/**
 * Whether an `If-None-Match` header matches `etag`, using the weak comparison
 * RFC 9110 §13.1.2 prescribes for it: `*`, or any listed tag ignoring `W/`.
 */
export function ifNoneMatchHits(ifNoneMatch: string | undefined, etag: string): boolean {
  if (ifNoneMatch === undefined) {
    return false;
  }

  return ifNoneMatch.split(",").some((candidate) => {
    const tag = candidate.trim();

    return tag === "*" || tag.replace(/^W\//, "") === etag;
  });
}

/**
 * Assets are served from the site's own origin, and an SVG opened directly is a
 * live document. No script may run in one, and `sandbox` gives it an opaque
 * origin; inline styles stay allowed so styled SVGs still render.
 */
export const ASSET_CONTENT_SECURITY_POLICY = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

export interface ResolvedAsset {
  fullPath: string;
  contentType: string;
}

/**
 * Decode → traversal-guard → MIME lookup. Returns null on any miss so the
 * caller can answer 404 without distinguishing the reason over the wire.
 */
export function resolveContentAsset(imageRoot: string, rawPath: string): ResolvedAsset | null {
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  const fullPath = resolveWithinRoot(imageRoot, decodedPath);

  if (fullPath === null) {
    return null;
  }

  const extension = extname(fullPath).toLowerCase();
  const contentType = IMAGE_MIME_TYPES[extension];

  if (contentType === undefined) {
    return null;
  }

  return { fullPath, contentType };
}
