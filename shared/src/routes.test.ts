import { describe, expect, test } from "bun:test";
import { API_BASE, ROUTES } from "./index";

describe("shared route constants", () => {
  test("API_BASE starts with /", () => {
    expect(API_BASE.startsWith("/")).toBe(true);
  });

  test("API_BASE does not end with /", () => {
    expect(API_BASE.endsWith("/")).toBe(false);
  });

  test("every route starts with /", () => {
    for (const [, path] of Object.entries(ROUTES)) {
      expect(path.startsWith("/")).toBe(true);
    }
  });

  test("ROUTES contains expected keys", () => {
    expect(ROUTES).toHaveProperty("HELLO");
    expect(ROUTES).toHaveProperty("HEALTH");
    expect(ROUTES).toHaveProperty("ROOT");
  });

  test("ROUTES values are strings", () => {
    for (const [, path] of Object.entries(ROUTES)) {
      expect(typeof path).toBe("string");
    }
  });

  test("ROUTES.ROOT is /", () => {
    expect(ROUTES.ROOT).toBe("/");
  });
});
