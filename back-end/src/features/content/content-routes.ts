import type { FastifyInstance } from "fastify";
import type { ContentType } from "shared";
import { ROUTES, CONTENT_TYPES } from "shared";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { listContent, getContentBySlug } from "./content";
import { ASSET_CACHE_CONTROL, ASSET_PATH_PREFIX, resolveContentAsset } from "./image-assets";

/**
 * Register content JSON API routes on a Fastify instance scoped under API_BASE.
 *
 * - GET /content       — list all content items (frontmatter only), optional ?type= filter
 * - GET /content/:slug — get a single content item (frontmatter + body)
 */
export function registerContentRoutes(app: FastifyInstance, contentDir: string): void {
  app.get<{ Querystring: { type?: string } }>(ROUTES.CONTENT, async (request) => {
    const { type } = request.query;
    const typeFilter = type !== undefined && (CONTENT_TYPES as readonly string[]).includes(type)
      ? (type as ContentType)
      : undefined;
    return listContent(contentDir, { type: typeFilter });
  });

  app.get<{ Params: { slug: string } }>(ROUTES.CONTENT_BY_SLUG, async (request, reply) => {
    const item = await getContentBySlug(request.params.slug, contentDir);

    if (item === null) {
      return reply.status(404).send({ error: "Content not found" });
    }

    return item;
  });
}

/**
 * Register the static content image route at the root.
 *
 * Image embeds use /content-assets/images/* — an asset path, not an API call,
 * so it stays at the root (cloudflared routes it to the back-end on 3001).
 */
export function registerContentImageRoutes(app: FastifyInstance, contentDir: string): void {
  const imageRoot = resolve(contentDir, "images");

  app.get<{ Params: { "*": string } }>(`${ASSET_PATH_PREFIX}*`, async (request, reply) => {
    const resolved = resolveContentAsset(imageRoot, request.params["*"]);

    if (resolved === null) {
      return reply.status(404).send({ error: "Image not found" });
    }

    try {
      const imageBuffer = await readFile(resolved.fullPath);
      reply.header("Cache-Control", ASSET_CACHE_CONTROL);
      reply.type(resolved.contentType);
      return await reply.send(imageBuffer);
    } catch (error) {
      if (
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "EISDIR")
      ) {
        return reply.status(404).send({ error: "Image not found" });
      }

      throw error;
    }
  });
}