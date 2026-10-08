import type { FastifyInstance } from "fastify";

import { ROUTES } from "shared";

import { getPageBySlug } from "./pages";

/**
 * Register the standalone page route on a Fastify instance scoped under API_BASE.
 *
 * - GET /pages/:slug — a page from content/pages/ (frontmatter + body)
 */
export function registerPageRoutes(app: FastifyInstance, contentDir: string): void {
  app.get<{ Params: { slug: string } }>(ROUTES.PAGE_BY_SLUG, async (request, reply) => {
    const page = await getPageBySlug(request.params.slug, contentDir);

    if (page === null) {
      return reply.status(404).send({ error: "Page not found" });
    }

    return page;
  });
}
