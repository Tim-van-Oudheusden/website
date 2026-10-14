import { describe, expect, test } from "bun:test";

import { isLoopbackAddress, rateLimitClientKey } from "../../../../back-end/src/core/network";

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

describe("rateLimitClientKey", () => {
  test("groups IPv6 addresses by their /64 prefix", () => {
    expect(rateLimitClientKey("2001:db8:1:2::a")).toBe(rateLimitClientKey("2001:DB8:0001:0002:ffff:1:2:3"));
    expect(rateLimitClientKey("2001:db8:1:2::a")).not.toBe(rateLimitClientKey("2001:db8:1:3::a"));
  });

  test("ignores an IPv6 zone index", () => {
    expect(rateLimitClientKey("fe80::1%eth0")).toBe(rateLimitClientKey("fe80::2"));
  });

  test("collapses IPv4-mapped IPv6 to the plain IPv4 address", () => {
    expect(rateLimitClientKey("::ffff:198.51.100.20")).toBe("198.51.100.20");
    expect(rateLimitClientKey("0:0:0:0:0:FFFF:198.51.100.20")).toBe("198.51.100.20");
    expect(rateLimitClientKey("::ffff:c633:6414")).toBe("198.51.100.20");
  });

  test("keeps distinct IPv4-mapped addresses distinct", () => {
    expect(rateLimitClientKey("::ffff:198.51.100.20")).not.toBe(rateLimitClientKey("::ffff:198.51.100.21"));
  });

  test("returns IPv4 and non-IP values unchanged", () => {
    expect(rateLimitClientKey("203.0.113.5")).toBe("203.0.113.5");
    expect(rateLimitClientKey("not-an-ip")).toBe("not-an-ip");
  });
});
