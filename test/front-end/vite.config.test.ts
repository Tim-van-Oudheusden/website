import { describe, expect, test } from "bun:test";
import * as path from "path";

import { createLogger, loadConfigFromFile } from "vite";

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

describe("vite config loading", () => {
  // Vite's default (bundle) loader warns about anything `configLoader: 'native'`
  // cannot load; native is planned to become the default in a future major (#1201).
  test("is compatible with the native config loader", async () => {
    delete process.env["VITE_CONFIG_NATIVE_IGNORE_WARNING"];
    const warnings: string[] = [];
    const logger = createLogger("warn");

    logger.warn = (message) => {
      warnings.push(message);
    };

    await loadConfigFromFile(
      { command: "build", mode: "production" },
      path.resolve(import.meta.dir, "../../front-end/vite.config.ts"),
      undefined,
      "warn",
      logger,
    );

    expect(warnings).toEqual([]);
  });
});
