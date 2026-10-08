import type { FastifyInstance } from "fastify";

import { ROUTES } from "shared";

import { isLoopbackAddress } from "../../core/rate-limit";
import { getContentBySlug } from "../content/content";

import type { ViewStore } from "./view-store";

const VIEWS_STATS_ROUTE = "/views";
const ISO_DATE_LENGTH = 10;

function today(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LENGTH);
}

/**
 * POST /views/:slug (under API_BASE) — the front-end beacon fired when an
 * article is opened. Only slugs that exist on disk are counted, so the store
 * stays bounded by the content.
 */
export function registerViewBeaconRoute(app: FastifyInstance, contentDir: string, store: ViewStore): void {
  app.post<{ Params: { slug: string } }>(ROUTES.VIEW_BY_SLUG, async (request, reply) => {
    const item = await getContentBySlug(request.params.slug, contentDir);

    if (item === null) {
      return reply.status(404).send({ error: "Content not found" });
    }

    store.record(request.params.slug, today());

    return reply.status(204).send();
  });
}

/**
 * GET /views at the root — local-only read-back of the counts, like /metrics.
 * Cloudflared only forwards /api and /content-assets, so it is never public.
 */
export function registerViewStatsRoute(app: FastifyInstance, store: ViewStore): void {
  app.get(VIEWS_STATS_ROUTE, (request, reply) => {
    if (!isLoopbackAddress(request.raw.socket.remoteAddress)) {
      return reply.status(404).send();
    }

    return reply.send(store.list());
  });
}
