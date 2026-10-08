import { isAbsolute, relative, resolve } from "path";

/**
 * Resolve untrusted input (a slug, a URL segment) against `root`; null unless
 * the result is strictly inside `root`: never `root` itself, a ".." traversal
 * out of it, or an absolute escape to somewhere else. Decoding and extension
 * rules stay with the caller.
 *
 * The guard and the path it guards stay in this one function on purpose:
 * CodeQL's js/path-injection only trusts a `relative()` check in the function
 * that returns the checked value, not a boolean helper's verdict.
 */
export function resolveWithinRoot(root: string, untrustedPath: string): string | null {
  const fullPath = resolve(root, untrustedPath);
  const rel = relative(root, fullPath);

  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    return null;
  }

  return fullPath;
}
