import { describe, expect, test } from "bun:test";

import { isWithinRoot } from "../../../../back-end/src/core/safe-fs";

describe("isWithinRoot", () => {
  const root = "/tmp/content/images";

  test("accepts a path nested directly under the root", () => {
    expect(isWithinRoot(root, "/tmp/content/images/pixel.png")).toBe(true);
  });

  test("accepts a path nested under a subdirectory of the root", () => {
    expect(isWithinRoot(root, "/tmp/content/images/sub/pixel.png")).toBe(true);
  });

  test("rejects the root path itself", () => {
    expect(isWithinRoot(root, root)).toBe(false);
  });

  test("rejects a dot-segment escape to a sibling directory", () => {
    expect(isWithinRoot(root, "/tmp/content/escape.png")).toBe(false);
  });

  test("rejects an absolute path outside the root", () => {
    expect(isWithinRoot(root, "/etc/passwd")).toBe(false);
  });

  test("rejects a sibling directory that merely shares the root's name as a prefix", () => {
    expect(isWithinRoot(root, "/tmp/content/images-other/pixel.png")).toBe(false);
  });
});
