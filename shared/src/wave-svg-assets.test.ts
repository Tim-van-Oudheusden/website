import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readWaveSvgs(): Array<{ name: string; content: string }> {
  const imagesDir = resolve(import.meta.dirname, "../..", "public/images");
  const files = readdirSync(imagesDir)
    .filter((name) => name.startsWith("wave-") && name.endsWith(".svg"))
    .sort();

  return files.map((name) => ({
    name,
    content: readFileSync(resolve(imagesDir, name), "utf8"),
  }));
}

describe("wavy SVG assets", () => {
  test("use 16:9 non-repeating layered compositions", () => {
    const waveSvgs = readWaveSvgs();

    expect(waveSvgs.length).toBeGreaterThan(0);

    for (const waveSvg of waveSvgs) {
      expect(waveSvg.content).toContain('viewBox="0 0 1600 900"');
      expect(waveSvg.content).toContain('width="1600"');
      expect(waveSvg.content).toContain('height="900"');
      expect(waveSvg.content).not.toContain("<pattern");
      expect((waveSvg.content.match(/<path\b/g) ?? []).length).toBeGreaterThanOrEqual(3);
    }
  });
});
