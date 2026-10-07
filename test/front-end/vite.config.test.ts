import { describe, expect, test } from "bun:test";
import * as path from "path";

import { ASSET_PATH_PREFIX } from "shared";

import config from "../../front-end/vite.config";

describe("vite production build defaults", () => {
  test("does not emit sourcemaps by default", () => {
    expect(config.build?.sourcemap).toBe(false);
  });

  test("serves static assets from the workspace public directory", () => {
    expect(config.publicDir).toBe(path.resolve(import.meta.dir, "../../public"));
  });
});

describe("vite dev server proxy", () => {
  test("forwards content images to the back-end, as cloudflared does in production", () => {
    expect(Object.keys(config.server?.proxy ?? {})).toContain(ASSET_PATH_PREFIX);
  });
});
