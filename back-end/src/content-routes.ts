import type { FastifyInstance } from "fastify";
import type { ContentType } from "shared";
import { ROUTES, CONTENT_TYPES } from "shared";
import { readFile } from "fs/promises";
import { extname, isAbsolute, relative, resolve } from "path";
import { listContent, getContentBySlug } from "./content";

const CONTENT_IMAGE_ROUTE_PREFIX = "/content-assets/images/";
const CACHE_CONTROL_HEADER = "public, max-age=31536000, immutable";
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

function isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
  const rel = relative(rootPath, candidatePath);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * Register content API routes on a Fastify instance.
 *
 * - GET /content       — list all content items (frontmatter only), optional ?type= filter
 * - GET /content/:slug — get a single content item (frontmatter + body)
 */
export function registerContentRoutes(app: FastifyInstance, contentDir: string): void {
  const imageRoot = resolve(contentDir, "images");

  app.get(`${CONTENT_IMAGE_ROUTE_PREFIX}*`, async (request, reply) => {
    const imagePath = (request.params as { "*": string })["*"];
    const decodedImagePath = decodeURIComponent(imagePath);
    const fullPath = resolve(imageRoot, decodedImagePath);

    if (!isPathInsideRoot(fullPath, imageRoot)) {
      return reply.status(404).send({ error: "Image not found" });
    }

    const extension = extname(fullPath).toLowerCase();
    const contentType = IMAGE_MIME_TYPES[extension];
    if (contentType === undefined) {
      return reply.status(404).send({ error: "Image not found" });
    }

    try {
      const imageBuffer = await readFile(fullPath);
      reply.header("Cache-Control", CACHE_CONTROL_HEADER);
      reply.type(contentType);
      return await reply.send(imageBuffer);
    } catch (error) {
      if (
        typeof error === "object"
        && error !== null
        && "code" in error
        && (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        return reply.status(404).send({ error: "Image not found" });
      }

      throw error;
    }
  });

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
