import type { PageData } from "shared";
import { ROUTES } from "shared";

import { ApiError, apiGet, slugPath } from "@/shared/lib/api";

/**
 * Fetch a standalone page (content/pages/<slug>.md). Resolves null when the
 * page does not exist; every other failure rejects so callers can surface it.
 */
export async function fetchPage(slug: string): Promise<PageData | null> {
  try {
    return await apiGet<PageData>(slugPath(ROUTES.PAGE_BY_SLUG, slug));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
}
