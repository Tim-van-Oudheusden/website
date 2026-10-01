import { extname, isAbsolute, relative, resolve } from "path";

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
 * URL path under which content images are served. Shared by the HTTP route
 * and the Obsidian embed rewriter so a prefix change lands in one place.
 */
export const ASSET_PATH_PREFIX = "/content-assets/images/";

/**
 * Asset filenames are fixed content paths, so the response is safe to cache
 * immutably for a year.
 */
export const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

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

  const fullPath = resolve(imageRoot, decodedPath);
  const rel = relative(imageRoot, fullPath);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return null;
  }

  const extension = extname(fullPath).toLowerCase();
  const contentType = IMAGE_MIME_TYPES[extension];
  if (contentType === undefined) {
    return null;
  }

  return { fullPath, contentType };
}