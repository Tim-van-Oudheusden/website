/**
 * Where a content item's `socialImage` is served from.
 *
 * Kept apart from index.ts so the back-end coverage run (which imports only
 * the constants from index.ts) never loads front-end-only helpers.
 */
import { ASSET_PATH_PREFIX } from "./index";

/**
 * Resolve a `socialImage` frontmatter value to a site path. "/images/me.png" is
 * a site path (front-end `public/`) and stays as is; "images/cover.png" is
 * relative to the content directory, which the back-end serves under
 * `ASSET_PATH_PREFIX`. `null` (no image set) stays `null`.
 */
export function resolveSocialImagePath(socialImage: string | null): string | null {
  if (socialImage === null) {
    return null;
  }

  return socialImage.startsWith("/")
    ? socialImage
    : `${ASSET_PATH_PREFIX}${socialImage.replace(/^images\//, "")}`;
}
