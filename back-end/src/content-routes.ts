import type { FastifyInstance } from "fastify";
import type { ContentType } from "shared";
import { ROUTES, CONTENT_TYPES } from "shared";
import { listContent, getContentBySlug } from "./content";

/**
 * Register content API routes on a Fastify instance.
 *
 * - GET /content       — list all content items (frontmatter only), optional ?type= filter
 * - GET /content/:slug — get a single content item (frontmatter + body)
 */
export function registerContentRoutes(app: FastifyInstance, contentDir: string): void {
  app.get(ROUTES.CONTENT, async (request) => {
    const { type } = request.query as { type?: string };
    const typeFilter = type !== undefined && (CONTENT_TYPES as readonly string[]).includes(type)
      ? (type as ContentType)
      : undefined;
    return listContent(contentDir, { type: typeFilter });
  });

  app.get(ROUTES.CONTENT_BY_SLUG, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const item = await getContentBySlug(slug, contentDir);

    if (item === null) {
      return reply.status(404).send({ error: "Content not found" });
    }

    return item;
  });
}
