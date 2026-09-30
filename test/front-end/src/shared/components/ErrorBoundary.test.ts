import { describe, expect, test } from "bun:test";
import { ErrorBoundary } from "../../../../../front-end/src/shared/components/ErrorBoundary";

describe("ErrorBoundary", () => {
  test("is exported as a class component", () => {
    expect(typeof ErrorBoundary).toBe("function");
    expect(ErrorBoundary.prototype).toHaveProperty("render");
  });
});
