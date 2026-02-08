import { describe, expect, test } from "bun:test";
import config from "./vite.config";

describe("vite production build defaults", () => {
  test("does not emit sourcemaps by default", () => {
    expect(config.build?.sourcemap).toBe(false);
  });
});
