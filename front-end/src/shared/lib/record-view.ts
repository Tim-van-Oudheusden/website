import { API_BASE, ROUTES } from "shared";

/**
 * Fire-and-forget view beacon: tells the back-end an article was opened.
 * No cookies, no identifiers; failures are ignored so analytics can never
 * break reading.
 */
export function recordView(slug: string): void {
  const path = ROUTES.VIEW_BY_SLUG.replace(":slug", encodeURIComponent(slug));

  fetch(`${API_BASE}${path}`, { method: "POST", keepalive: true }).catch(() => undefined);
}
