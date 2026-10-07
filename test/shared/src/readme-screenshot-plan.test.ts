import { describe, expect, test } from "bun:test";
import { basename, relative, resolve } from "node:path";

import type { Capture } from "../../../scripts/readme-screenshot-plan";
import { defineCapture, README_CAPTURES } from "../../../scripts/readme-screenshot-plan";

const ROOT = resolve(import.meta.dirname, "../../..");
const ASSETS_DIR = resolve(ROOT, "docs/assets/readme");

const VIEWPORT = { width: 1280, height: 800 };

function captureNamed(file: string): Capture {
  const capture = README_CAPTURES.find((candidate) => basename(candidate.output) === file);

  if (capture === undefined) {
    throw new Error(`No README capture writes ${file}`);
  }

  return capture;
}

describe("scripts/readme-screenshot-plan.ts", () => {
  test("rejects a theme the screenshots cannot pin down", () => {
    for (const theme of ["sepia", "system", "", "Dark"]) {
      expect(() => defineCapture({ file: "home.png", theme, viewport: VIEWPORT, deviceScaleFactor: 1 }))
        .toThrow(/theme/);
    }

    expect(defineCapture({ file: "home.png", theme: "dark", viewport: VIEWPORT, deviceScaleFactor: 1 }).theme)
      .toBe("dark");
  });

  test("writes every capture inside docs/assets/readme/ and refuses files that escape it", () => {
    for (const capture of README_CAPTURES) {
      const fromAssets = relative(ASSETS_DIR, resolve(ROOT, capture.output));

      expect(fromAssets.startsWith("..")).toBe(false);
      expect(fromAssets).not.toBe("");
    }

    for (const file of ["../home.png", "../../README.png", "/tmp/home.png", "", "."]) {
      expect(() => defineCapture({ file, theme: "light", viewport: VIEWPORT, deviceScaleFactor: 1 }))
        .toThrow(/docs\/assets\/readme/);
    }
  });

  test("renders the social preview at exactly GitHub's recommended 1280×640", () => {
    const preview = captureNamed("social-preview.png");

    expect(preview.viewport.width * preview.deviceScaleFactor).toBe(1280);
    expect(preview.viewport.height * preview.deviceScaleFactor).toBe(640);
  });

  test("captures the light and dark home page at one size, so the <picture> swap keeps the layout", () => {
    const light = captureNamed("home-light.png");
    const dark = captureNamed("home-dark.png");

    expect([light.theme, dark.theme]).toEqual(["light", "dark"]);
    expect(dark.viewport).toEqual(light.viewport);
    expect(dark.deviceScaleFactor).toBe(light.deviceScaleFactor);
  });
});
