/**
 * Shared module — types, utilities, and constants used by both front-end and back-end.
 */

export const APP_NAME = "website";

/**
 * Site name and hero line, verbatim from `BRANDING.md` §1–2. Hand-copied into
 * `front-end/index.html` (title, atom feed link) and `public/manifest.webmanifest`
 * (name) — those static files can't import this constant, but their tests
 * assert against it so the copies can't silently drift apart. The front-end's
 * SiteLogo wordmark and home "start" section import it directly instead.
 */
export const SITE_NAME = "Build with Tim";

/** Site owner, as `BRANDING.md` §3 names him: author of every article. */
export const SITE_OWNER = "Tim van Oudheusden";

/** The home "start" section's hero copy, verbatim from `BRANDING.md` §2. */
export const HERO_LINE = "I'm Tim, a software engineer. I build small, self-hosted tools and write down how they work.";

/**
 * Where the front-end server answers with the site's Atom feed. Hand-copied into
 * the autodiscovery link in `front-end/index.html`, whose test asserts the copy.
 */
export const FEED_PATH = "/feed.xml";

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
  PAGE_BY_SLUG: "/pages/:slug",
  VIEW_BY_SLUG: "/views/:slug",
  HIVE_METRICS: "/hive/metrics",
} as const;

/**
 * Age after which a part of the Hive metrics counts as stale (10 minutes).
 * The back-end reports `state: "stale"` once any part is older than this.
 */
export const HIVE_METRICS_STALE_AFTER_MS = 600_000;

/**
 * Days the Hive metrics' pull requests and runs cover, ending today (UTC).
 * The back-end asks Hive and GitHub for this window; the page names it.
 */
export const HIVE_METRICS_WINDOW_DAYS = 30;

/**
 * URL path under which the back-end serves content images (content/images/*).
 * Used by the back-end route, its Obsidian embed rewriter, and the front-end
 * server's link-preview tags, so a prefix change lands in one place.
 */
export const ASSET_PATH_PREFIX = "/content-assets/images/";

/**
 * Slugs of standalone markdown pages served from `content/pages/<slug>.md`,
 * routed at `/<slug>`. Used by the front-end router (to register each route)
 * and the front-end server (to list each page in the sitemap, and to answer
 * the page's path with the app shell instead of a 404), so a page can never be
 * wired into one without the other. llms.txt does not list these pages.
 */
export const STANDALONE_PAGE_SLUGS = ["now", "uses"] as const;

/**
 * Path of the Agentic page, which shows how Tim builds with AI agents. Used by
 * the front-end router and nav, and by the front-end server (to answer the
 * path with the app shell, and to list it in the sitemap and llms.txt).
 */
export const AGENTIC_PAGE_PATH = "/agentic";

/**
 * The Agentic page's intro, shown under its heading. The front-end server
 * sends it as the page's description and link-preview text, so it lives here.
 */
export const AGENTIC_INTRO = "I build this site with AI agents: they pick up GitHub issues and open pull requests, "
  + "which go through the same checks and review as mine. This page shows how that works.";

/**
 * The Projects page's description, shown under its heading. The front-end
 * server sends it as the page's description and link-preview text, so it lives here.
 */
export const PROJECTS_DESCRIPTION = "A curated set of projects that show how I build practical, maintainable systems "
  + "across content, automation, and web experiences.";

/**
 * The mark's blue (see `BRANDING.md`). Hand-copied into `public/favicon.svg`'s
 * fill and `front-end/src/index.css`'s `--primary`/`--chart-1` tokens — those
 * static files can't import this constant, but their tests assert against it
 * so the copies can't silently drift apart. The browser chrome does not use
 * it: `theme-color` and the manifest follow the page colour below.
 */
export const BRAND_COLOR = "#3584e4" as const;

/**
 * The page colour, `--site-page-bg` in `front-end/src/index.css`, of the light
 * and the dark theme. The browser chrome matches the top of the page:
 * `front-end/index.html` has one `theme-color` meta tag per scheme for the
 * first paint, `applyTheme` sets both to the chosen theme's colour, and
 * `public/manifest.webmanifest` uses the light one for `theme_color` and
 * `background_color`. `test/shared/src/shared-literals.test.ts` reads every
 * copy so they can't drift apart.
 */
export const PAGE_COLOR_LIGHT = "#f3efe5" as const;
export const PAGE_COLOR_DARK = "#1c1b1a" as const;

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
  /**
   * `YYYY-MM-DD` day the content last changed, never before `date`; null when
   * the frontmatter omits it. Read it as `updated ?? date`.
   */
  updated: string | null;
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
   * code).
   */
  homeRecommended: boolean;
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

/**
 * A standalone page such as /now or /uses: a markdown file under
 * `content/pages/`, served by slug and never listed with articles/projects.
 */
export interface PageData {
  slug: string;
  title: string;
  description: string;
  /** ISO 8601 date the page was last updated. */
  updated: string;
  /** Raw markdown body, with Obsidian image embeds rewritten. */
  body: string;
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

/* ── Hive metrics (GET /hive/metrics) ── */

/** Hive governor mode; Hive sends IDLE/QUIET/BUSY/SURGE, lower-cased here. */
export type GovernorMode = "idle" | "quiet" | "busy" | "surge";

/**
 * Public, allowlisted Hive metrics: only counts, durations, modes and
 * timestamps. `hive`, `contributors` and `repo` fail independently and are
 * null when their upstream is unavailable.
 */
export interface HivePublicMetrics {
  /** From Hive's /api/health. */
  online: boolean;
  /** From /api/widget/summary; null without a working widget token. */
  hive: {
    /** Mode of the latest history point. */
    mode: GovernorMode;
    agents: { total: number; running: number };
    /** Work counts of the latest history point. */
    work: { issues: number; prs: number; held: number; actionable: number; mergeable: number };
    history: { t: string; mode: GovernorMode; issues: number; prs: number; held: number }[];
  } | null;
  /** From /api/contribute/*; null when unavailable. */
  contributors: {
    collectedAt: string;
    /** Contributor agents connected in the latest hour Hive measured; 0 without a usable hourly series. */
    fleet: number;
    /**
     * UTC days, oldest first, the last one the day Hive collected in: tasks done, summed, and the most contributor
     * agents connected in any hour. Built from the hours the back-end has stored, since Hive keeps only the last 168:
     * from the first whole day stored, at most `HIVE_METRICS_WINDOW_DAYS`. A day without stored hours counts zero.
     * Empty without any usable hour.
     */
    days: { t: string; tasks: number; fleet: number }[];
    /** Agent runs over the last `HIVE_METRICS_WINDOW_DAYS` days. */
    runs: {
      total: number;
      backends: {
        backend: string;
        completed: number;
        failed: number;
        abandoned: number;
        p50Seconds: number | null;
        p95Seconds: number | null;
      }[];
    };
  } | null;
  /** This repo's public GitHub PRs over the last `HIVE_METRICS_WINDOW_DAYS` UTC days; null when unavailable. */
  repo: {
    from: string;
    to: string;
    /** `HIVE_METRICS_WINDOW_DAYS` UTC days, oldest first, the last one today. */
    days: { t: string; opened: number; merged: number; closedUnmerged: number }[];
    mergedBySource: { t: string; hive: number; claudeCode: number; dependabot: number; other: number }[];
    /** PRs merged in the window, created → merged. */
    medianHoursToMerge: number | null;
    p90HoursToMerge: number | null;
  } | null;
}

/** Response returned by the GET /hive/metrics endpoint. */
export interface HiveMetricsResponse {
  state: "live" | "stale" | "unavailable";
  /** When the back-end last got a good upstream answer; null if never. */
  fetchedAt: string | null;
  metrics: HivePublicMetrics | null;
}
