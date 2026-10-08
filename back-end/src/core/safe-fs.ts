import { isAbsolute, relative } from "path";

/**
 * True when `fullPath` is strictly inside `root` — never `root` itself, a
 * ".." traversal out of it, or an absolute escape to somewhere else. Callers
 * resolve `fullPath` from untrusted input (a slug, a URL segment) themselves;
 * this only checks the result, so decoding and extension rules stay with
 * the caller.
 */
export function isWithinRoot(root: string, fullPath: string): boolean {
  const rel = relative(root, fullPath);

  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
