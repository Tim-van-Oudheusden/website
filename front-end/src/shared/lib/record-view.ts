import { API_BASE, ROUTES } from "shared";

import { slugPath } from "./api";

/**
 * Fire-and-forget view beacon: tells the back-end an article or project was opened.
 * No cookies, no identifiers; a failure never blocks or breaks reading, but
 * it is logged so a systemic failure (back-end down, a route rename) is
 * still observable instead of silently undercounting views.
 */
export function recordView(slug: string): void {
  const path = slugPath(ROUTES.VIEW_BY_SLUG, slug);

  fetch(`${API_BASE}${path}`, { method: "POST", keepalive: true }).catch((err: unknown) => {
    console.warn(`[record-view] failed to record a view for "${slug}":`, err);
  });
}
