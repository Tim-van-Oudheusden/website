import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const publicDir = resolve(import.meta.dir, "../../../public");

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
}

interface WebAppManifest {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
}

/** Width and height from a PNG's IHDR chunk, or null when the file is not a PNG. */
function pngSize(path: string): { width: number; height: number } | null {
  const bytes = readFileSync(path);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (!signature.every((byte, index) => bytes[index] === byte)) {
    return null;
  }

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("public/manifest.webmanifest", () => {
  const manifest = JSON.parse(readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf-8")) as WebAppManifest;

  test("names the site and opens on the home page", () => {
    expect(manifest.name).toBe("Build with Tim");
    expect(manifest.short_name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("minimal-ui");
  });

  test("uses the brand blue of the favicon for the browser chrome", () => {
    expect(manifest.theme_color).toBe("#3584e4");
    expect(manifest.background_color).toBe("#3584e4");
    expect(readFileSync(resolve(publicDir, "favicon.svg"), "utf-8")).toContain('fill="#3584e4"');
  });

  test("lists 192px and 512px PNG icons that exist at their declared size", () => {
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);

    for (const icon of manifest.icons) {
      const [width, height] = icon.sizes.split("x").map(Number);

      expect(icon.type).toBe("image/png");
      expect(icon.src.startsWith("/")).toBe(true);
      expect(pngSize(resolve(publicDir, `.${icon.src}`))).toEqual({ width: width ?? 0, height: height ?? 0 });
    }
  });
});

describe("public/apple-touch-icon.png", () => {
  test("is a 180px PNG, the size iOS uses for the home screen", () => {
    expect(pngSize(resolve(publicDir, "apple-touch-icon.png"))).toEqual({ width: 180, height: 180 });
  });
});
