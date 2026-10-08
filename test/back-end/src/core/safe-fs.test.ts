import { describe, expect, test } from "bun:test";

import { resolveWithinRoot } from "../../../../back-end/src/core/safe-fs";

describe("resolveWithinRoot", () => {
  const root = "/tmp/content/images";

  test("resolves a path directly under the root to its absolute location", () => {
    expect(resolveWithinRoot(root, "pixel.png")).toBe("/tmp/content/images/pixel.png");
  });

  test("resolves a path nested under a subdirectory of the root", () => {
    expect(resolveWithinRoot(root, "sub/pixel.png")).toBe("/tmp/content/images/sub/pixel.png");
  });

  test("rejects the root path itself", () => {
    expect(resolveWithinRoot(root, ".")).toBeNull();
  });

  test("rejects a dot-segment escape to a sibling directory", () => {
    expect(resolveWithinRoot(root, "../escape.png")).toBeNull();
  });

  test("rejects an absolute path outside the root", () => {
    expect(resolveWithinRoot(root, "/etc/passwd")).toBeNull();
  });

  test("rejects a sibling directory that merely shares the root's name as a prefix", () => {
    expect(resolveWithinRoot(root, "../images-other/pixel.png")).toBeNull();
  });
});
