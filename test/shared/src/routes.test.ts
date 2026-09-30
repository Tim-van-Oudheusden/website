import { describe, expect, test } from "bun:test";
import { API_BASE, BACKEND_HOST, BACKEND_PORT, FRONTEND_PORT, ROUTES } from "../../../shared/src/index";

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
    expect(ROUTES).toHaveProperty("CONTENT");
    expect(ROUTES).toHaveProperty("CONTENT_BY_SLUG");
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

describe("shared network constants", () => {
  test("BACKEND_HOST defaults to localhost", () => {
    expect(BACKEND_HOST).toBe("localhost");
  });

  test("BACKEND_PORT is a valid port number", () => {
    expect(BACKEND_PORT).toBeGreaterThan(0);
    expect(BACKEND_PORT).toBeLessThanOrEqual(65535);
    expect(Number.isInteger(BACKEND_PORT)).toBe(true);
  });

  test("FRONTEND_PORT is a valid port number", () => {
    expect(FRONTEND_PORT).toBeGreaterThan(0);
    expect(FRONTEND_PORT).toBeLessThanOrEqual(65535);
    expect(Number.isInteger(FRONTEND_PORT)).toBe(true);
  });

  test("BACKEND_PORT and FRONTEND_PORT are different", () => {
    expect(BACKEND_PORT).not.toBe(FRONTEND_PORT);
  });
});
