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

/**
 * URL path under which the back-end serves content images (content/images/*).
 * Used by the back-end route, its Obsidian embed rewriter, and the front-end
 * server's link-preview tags, so a prefix change lands in one place.
 */
export const ASSET_PATH_PREFIX = "/content-assets/images/";

/**
 * Request header carrying the visitor's real IP behind Cloudflare Tunnel.
 * Used by the back-end rate limiter (to key limits per visitor) and the
 * front-end server (to forward it when proxying article-preview fetches),
 * so a mismatch between the two can never silently collapse rate limiting
 * into one shared bucket.
 */
export const CF_CONNECTING_IP_HEADER = "cf-connecting-ip";

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
  /** Derived from the filename when the frontmatter omits it. */
  slug: string;
  /** Social/cover image path used by article listing surfaces; null when unset. */
  socialImage: string | null;
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
  /**
   * Opts the article into the homepage "for you" curated pool (mirrors
   * projects' `featured`/`prioritySlot`: editorial priority as content, not
   * code). Optional so that existing fixtures/tests built before this field
   * existed keep compiling; absent is equivalent to `false`.
   */
  homeRecommended?: boolean;
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
  /** Priority slot (1, 2, or 3) for prominent placement on the Projects page; null when unplaced. */
  prioritySlot: 1 | 2 | 3 | null;
  status: ProjectStatus | null;
  role: string | null;
  created: string | null;
  links: ProjectLink[];
  info: string | null;
}

export type ContentFrontmatter = ArticleFrontmatter | ProjectFrontmatter;

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
  /** The failing dependency check when status is not "ok"; null when "ok". */
  error: string | null;
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
