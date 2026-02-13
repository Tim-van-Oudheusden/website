import { describe, expect, test } from "bun:test";
import * as path from "path";
import config from "./vite.config";

describe("vite production build defaults", () => {
  test("does not emit sourcemaps by default", () => {
    expect(config.build?.sourcemap).toBe(false);
  });

  test("serves static assets from the workspace public directory", () => {
    expect(config.publicDir).toBe(path.resolve(import.meta.dir, "../public"));
  });
});
