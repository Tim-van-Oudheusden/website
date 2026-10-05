import { describe, expect, test } from "bun:test";
import { resolveContentAsset } from "../../../../../back-end/src/features/content/image-assets";

describe("resolveContentAsset", () => {
  const imageRoot = "/tmp/content/images";

  test("resolves an image path inside the root with its content type", () => {
    const result = resolveContentAsset(imageRoot, "pixel.png");
    expect(result).toEqual({
      fullPath: "/tmp/content/images/pixel.png",
      contentType: "image/png",
    });
  });

  test("resolves uppercase extensions to the matching MIME type", () => {
    const result = resolveContentAsset(imageRoot, "pixel.PNG");
    expect(result?.contentType).toBe("image/png");
  });

  test("returns null for a non-image extension", () => {
    expect(resolveContentAsset(imageRoot, "pixel.md")).toBeNull();
    expect(resolveContentAsset(imageRoot, "notes.txt")).toBeNull();
  });

  test.each(["%.png", "%E0%A4%A.png", "pixel%2.png"])(
    "returns null instead of throwing for the malformed percent-encoding %p",
    (rawPath) => {
      expect(resolveContentAsset(imageRoot, rawPath)).toBeNull();
    },
  );

  test("returns null for an empty raw path", () => {
    expect(resolveContentAsset(imageRoot, "")).toBeNull();
  });

  test("returns null for dot-segment traversal escaping the root", () => {
    expect(resolveContentAsset(imageRoot, "../escape.png")).toBeNull();
    expect(resolveContentAsset(imageRoot, "..%2fescape.png")).toBeNull();
  });

  test("returns null for an absolute path targeting an image", () => {
    expect(resolveContentAsset(imageRoot, "/etc/passwd.png")).toBeNull();
  });

  test("returns null for a directory path with no trailing extension", () => {
    expect(resolveContentAsset(imageRoot, "subdir/")).toBeNull();
  });
});