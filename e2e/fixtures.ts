import { createHash } from "node:crypto";

import { test as base, expect } from "@playwright/test";

import { CF_CONNECTING_IP_HEADER } from "../shared/src/index";

export { expect };

/**
 * A stable address for one test in the IPv6 documentation range 2001:db8::/32 (RFC 3849): the
 * test ID's hash fills the remaining 96 bits, so no two tests share one.
 */
function visitorAddress(testId: string): string {
  const groups = createHash("sha256").update(testId).digest("hex").slice(0, 24).match(/.{4}/gu) ?? [];

  return ["2001", "db8", ...groups].join(":");
}

/**
 * Every request a test sends, from the page or the `request` fixture, carries its own
 * `cf-connecting-ip`. The dev proxy reaches the back-end from loopback, and there the rate limiter
 * keys on that header, as it does for each visitor behind Cloudflare in production. Each test so
 * gets its own 50 req/min budget instead of the whole suite sharing the loopback one.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    await use({ ...extraHTTPHeaders, [CF_CONNECTING_IP_HEADER]: visitorAddress(testInfo.testId) });
  },
});
