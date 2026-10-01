/**
 * Shared module — types, utilities, and constants used by both front-end and back-end.
 */

export const APP_NAME = "website";

/* ── Network Constants ── */

/** Default port the back-end listens on. */
export const BACKEND_PORT = 3001;

/** Default port the front-end dev server binds to. */
export const FRONTEND_PORT = 5173;

/**
 * Default hostname for the back-end when reached from the front-end dev proxy.
 *
 * In the kube-play dev pod both containers share one network namespace, so
 * `localhost` reaches the back-end directly. Separate host processes (or any
 * non-pod setup) can override this via `VITE_BACKEND_HOST`.
 */
export const BACKEND_HOST = "localhost";

/* ── Route Constants ── */

/**
 * Base path prefix used by the front-end API client.
 *
 * The back-end registers its JSON routes under this prefix and the Vite dev
 * proxy forwards `/api/*` unchanged, so dev and prod share the same paths.
 */
export const API_BASE = "/api";

/**
 * Canonical route paths used by both front-end and back-end.
 *
 * - The **front-end** prefixes them with `API_BASE` before fetching.
 * - The **back-end** registers these paths inside a plugin scoped with
 *   `prefix: API_BASE`, so the handler for `HELLO` answers at `/api/hello`.
 */
export const ROUTES = {
  HELLO: "/hello",
  HEALTH: "/health",
  ROOT: "/",
  CONTENT: "/content",
  CONTENT_BY_SLUG: "/content/:slug",
} as const;

/* ── Content Schema ── */

/** The valid content types for Obsidian frontmatter entries. */
export const CONTENT_TYPES = ["article", "project"] as const;

export const PROJECT_STATUSES = ["Planned", "In Progress", "Shipped", "Archived"] as const;

export const PROJECT_LINK_TYPES = ["demo", "repo", "docs", "article", "external"] as const;

/** Canonical slug for the introduction article shown by default on /articles. */
export const DEFAULT_ARTICLE_SLUG = "introduction";

/** Allowed folder categories for article navigation on the Articles page. */
export const ARTICLE_CATEGORIES = ["Introduction", "Linux", "Work", "Personal Life"] as const;

/** Union type of valid content types. */
export type ContentType = (typeof CONTENT_TYPES)[number];

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectLinkType = (typeof PROJECT_LINK_TYPES)[number];

/** Union type of valid article categories. */
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

interface BaseContentFrontmatter {
  title: string;
  description: string;
  /** ISO 8601 date string. */
  date: string;
  tags: string[];
  draft: boolean;
  /** Derived from filename if absent. */
  slug?: string | undefined;
  /** Optional social/cover image path used by article listing surfaces. */
  socialImage?: string | undefined;
}

/**
 * Frontmatter fields expected in Obsidian markdown files.
 *
 * This is the contract between the back-end (which parses frontmatter)
 * and the front-end (which displays it).
 */
export interface ArticleFrontmatter extends BaseContentFrontmatter {
  type: "article";
  category: ArticleCategory;
}

export interface ProjectLink {
  type: ProjectLinkType;
  label: string;
  href: string;
}

export interface ProjectFrontmatter extends BaseContentFrontmatter {
  type: "project";
  coverImage: string;
  coverImageAlt: string;
  featured: boolean;
  projectOrder: number;
  /** Optional priority slot (1, 2, or 3) for prominent placement on the Projects page. */
  prioritySlot?: 1 | 2 | 3 | undefined;
  status?: ProjectStatus | undefined;
  role?: string | undefined;
  created?: string | undefined;
  links: ProjectLink[];
  info?: string | undefined;
}

export type ContentFrontmatter = ArticleFrontmatter | ProjectFrontmatter;

/* ── Content Ordering ── */

/** Article list item: the article contract plus a resolved slug. */
export type ArticleSummary = ArticleFrontmatter & { slug: string };

/** A full article: the summary fields plus the markdown body. */
export type ArticleData = ArticleSummary & { body: string };

/**
 * Newest-first article ordering with a documented tie-break.
 *
 * Dates are compared descending; when two dates are equal or unparseable,
 * titles sort ascending, then slugs ascending as the final tie-break.
 */
export function compareArticles(left: ArticleSummary, right: ArticleSummary): number {
  const leftTime = Date.parse(left.date);
  const rightTime = Date.parse(right.date);

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const titleDiff = left.title.localeCompare(right.title);
  if (titleDiff !== 0) {
    return titleDiff;
  }

  return left.slug.localeCompare(right.slug);
}

/* ── Shared Interfaces ── */

/**
 * Response returned by the GET /hello endpoint.
 *
 * This interface is consumed by both:
 *   - back-end:  to type the route handler return value
 *   - front-end: to type the API client response
 */
export interface HelloResponse {
  message: string;
  timestamp: string;
}

/**
 * Response returned by the GET /health endpoint.
 */
export interface HealthCheckResponse {
  status: ServiceStatus;
  name: string;
  uptime: number;
}

/* ── Shared Types ── */

/**
 * Union type representing the possible health statuses of a service.
 *
 * - "ok"       — service is running normally
 * - "degraded" — service is running with reduced functionality
 * - "error"    — service is experiencing failures
 */
export type ServiceStatus = "ok" | "degraded" | "error";
