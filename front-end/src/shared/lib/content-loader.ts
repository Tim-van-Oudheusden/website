import { ROUTES, type ProjectFrontmatter } from "shared";
import type { ArticleData, ArticleSummary } from "shared/articles";
import { ApiError, apiGet } from "./api";

/** The content-load surface every content-consuming feature depends on. */
export interface ContentLoader {
  listArticles(): Promise<ArticleSummary[]>;
  getArticle(slug: string): Promise<ArticleData>;
  listProjects(): Promise<ProjectFrontmatter[]>;
  getProject(slug: string): Promise<ProjectFrontmatter & { body: string }>;
}

/** A single loaded content document held by the in-memory test double. */
export type ContentItem = ArticleData | (ProjectFrontmatter & { body: string });

/**
 * Production loader: every read is an HTTP GET against the content API.
 *
 * Transport and HTTP errors reject so callers can surface them. `getArticle`
 * and `getProject` reject with `ApiError(404)` when the slug is absent, and
 * `getProject` also rejects when the slug resolves to an article so article
 * content can never render as a project page.
 */
export const httpContentLoader: ContentLoader = {
  async listArticles(): Promise<ArticleSummary[]> {
    const data = await apiGet<ArticleSummary[]>(`${ROUTES.CONTENT}?type=article`);

    return data.filter((item): item is ArticleSummary => typeof item.slug === "string");
  },

  async getArticle(slug: string): Promise<ArticleData> {
    const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", slug);

    return apiGet<ArticleData>(path);
  },

  async listProjects(): Promise<ProjectFrontmatter[]> {
    return apiGet<ProjectFrontmatter[]>(`${ROUTES.CONTENT}?type=project`);
  },

  async getProject(slug: string): Promise<ProjectFrontmatter & { body: string }> {
    const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", slug);
    const data = await apiGet<ContentItem>(path);

    if (data.type !== "project") {
      throw new ApiError(`Project not found: ${slug}`, 404);
    }

    return data;
  },
};

/** In-memory test double serving the same surface without any network. */
export function createMemoryContentLoader(items: ContentItem[]): ContentLoader {
  return {
    listArticles(): Promise<ArticleSummary[]> {
      return Promise.resolve(
        items.filter((item): item is ArticleData => item.type === "article"),
      );
    },

    getArticle(slug: string): Promise<ArticleData> {
      const found = items.find(
        (item): item is ArticleData => item.type === "article" && item.slug === slug,
      );

      if (found === undefined) {
        return Promise.reject(new ApiError(`Article not found: ${slug}`, 404));
      }

      return Promise.resolve(found);
    },

    listProjects(): Promise<ProjectFrontmatter[]> {
      return Promise.resolve(
        items.filter(
          (item): item is ProjectFrontmatter & { body: string } => item.type === "project",
        ),
      );
    },

    getProject(slug: string): Promise<ProjectFrontmatter & { body: string }> {
      const found = items.find(
        (item): item is ProjectFrontmatter & { body: string } =>
          item.type === "project" && item.slug === slug,
      );

      if (found === undefined) {
        return Promise.reject(new ApiError(`Project not found: ${slug}`, 404));
      }

      return Promise.resolve(found);
    },
  };
}
