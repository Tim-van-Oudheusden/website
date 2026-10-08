import { describe, expect, test } from "bun:test";

import { isLoopbackAddress } from "../../../../back-end/src/core/network";

describe("isLoopbackAddress", () => {
  test("accepts IPv4 loopback", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
  });

  test("accepts IPv6 loopback", () => {
    expect(isLoopbackAddress("::1")).toBe(true);
  });

  test("accepts IPv4-mapped IPv6 loopback", () => {
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
  });

  test("rejects a non-loopback address", () => {
    expect(isLoopbackAddress("203.0.113.5")).toBe(false);
  });

  test("rejects undefined", () => {
    expect(isLoopbackAddress(undefined)).toBe(false);
  });
});
