# Architecture Review Findings — Implementation Plans

> **For agentic workers:** one plan per candidate below; each maps to its own tracking issue (see "Follow-up issues"). REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement a plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the five deepening opportunities from the 2026-09-29 architecture review (issue #109) into concrete, TDD-ready implementation plans. This document is the deliverable; no implementation code ships with it.

**Source of truth:** The review report HTML (`/tmp/architecture-review-20260929-130926.html`) is no longer on disk. Every finding below was re-verified against the current tree at `main` (2026-09-30) with file:line references; where the review's line numbers or claims are stale, this document states the verified current state.

**Verification notes (staleness):**
- Candidate 1: extraction is *already* single-implementation — `extractMarkdownHeadings` and `extractMarkdownHeadingsWithOffsets` both call the same `collectMarkdownHeadings` (`front-end/src/shared/lib/markdown-headings.ts`). The second pipeline that survives is the renderer's position-lookup with an **independent invented-id fallback** (`slug-LINE-COLUMN`), which is where drift can still occur. Finding stands in substance.
- Candidate 5: `test/back-end/src/features/content/content-routes.test.ts` **already** covers the image route happy path (200, content-type, cache-control), unknown-file 404, and encoded traversal 404. The "untested through HTTP" claim is stale for the basics; what remains is the extension/MIME duplication, the directory-request edge, and residual decode cases.

**Tech Stack:** Bun TS workspace (`front-end`, `back-end`, `shared`), React 19 + react-markdown + react-router, Fastify, bun:test (render-to-static-markup for components), Conventional Commits. TDD per repo rules: one failing test at a time, confirm it fails for the right reason, implement, run the failing test, run the **full suite**, commit. Never weaken/delete existing tests except where a plan explicitly deletes dead coverage (see per-candidate "Tests" sections). Quality gates after each task: `bun test`, `bun run typecheck`, `bun run lint`, `bun run build`.

---

## Candidate 1 — Collapse the article document module (Strong)

### Current state (verified)

- `front-end/src/shared/lib/markdown-headings.ts` holds one line-scanning extractor `collectMarkdownHeadings` (ATX + setext + fenced-code tracking) plus `createHeadingIdResolver` (count-based dedup `slug`, `slug-1`, `slug-2`). Both public wrappers feed from it: `extractMarkdownHeadings` (line ~186) and `extractMarkdownHeadingsWithOffsets` (~194).
- `front-end/src/shared/components/markdown-renderer.tsx` renders `<h1/h2/h3 id={...}>` by looking up `node.position.start` in maps built from `extractMarkdownHeadingsWithOffsets(content, 3)` (line 120-126). When the lookup misses, `resolveHeadingIdFromPosition` (~128-160) **invents** `slugifyHeadingText(text)-LINE-COLUMN` — an id the TOC extraction will never produce. This is the only remaining cross-pipeline drift surface.
- `maxDepth: 3` hardcoded in two places: `markdown-renderer.tsx:121` and `extractArticleTableOfContents` (`front-end/src/features/articles/lib/article-toc.ts` → `extractMarkdownHeadings(markdownBody, 3)`).
- TOC consumers: `article-toc.ts` (`extractArticleTableOfContents`, `navigateToArticleHeadingById`, `resolveActiveTocHeadingIds`), `use-article-toc.ts`, `article-toc-nav.tsx`, all inside `features/articles` — these already consume `ArticleTableOfContentsItem` and are independent of the page shell.
- The only cross-module guard is `test/front-end/src/features/articles/pages/ArticlesPage.toc-consistency.test.ts`: filesystem-coupled, duplicates `stripFrontmatter` (lines 9-20), walks every `content/*.md`, additionally imports `extractArticleTableOfContents` through the **compatibility re-export** in `articles-page.tsx`.
- `front-end/src/features/articles/pages/article-page.tsx` is dead: `App.tsx:19` maps `/articles/:slug` → `ArticlesPage`; `ArticlePage` is referenced only by itself and two tests (`ArticlePage.layout.test.ts` class-string assertions, `article-page.test.tsx` view-state tests). It hosts the duplicated `ARTICLE_PAGE_TYPOGRAPHY_CLASSES` and a second fetch of `fetchArticleBySlug`.

### Target interface

`front-end/src/features/articles/lib/article-document.ts` (new):

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { extractArticleTableOfContents, type ArticleTableOfContentsItem } from "./article-toc";

export interface RenderedArticle {
  html: string;
  toc: ArticleTableOfContentsItem[];
}

/** Pure seam: full rendered HTML + the TOC that must match its heading ids. */
export function renderArticle(markdown: string): RenderedArticle {
  return {
    html: renderToStaticMarkup(createElement(MarkdownRenderer, { content: markdown })),
    toc: extractArticleTableOfContents(markdown),
  };
}
```

- `MarkdownRenderer` keeps rendering live pages (no per-render `renderToStaticMarkup` cost on the article page); `renderArticle` is the testable/SSR-able seam and the consumer of Candidate 3's shared shape (sequence: Candidate 3 → Candidate 1).
- Heading-id scheme becomes **single-source**: the count-based resolver already in `markdown-headings.ts`. The renderer's `slug-LINE-COLUMN` fallback is deleted; a lookup miss becomes a loud dev error (`console.error`) plus a deterministic `slugifyHeadingText(text) || "section"` return (no position suffix, so it can still coincide with a TOC id for unique headings instead of silently diverging).

### Files changed / deleted

- Create: `front-end/src/features/articles/lib/article-document.ts`
- Create: `test/front-end/src/features/articles/lib/article-document.test.ts`
- Modify: `front-end/src/shared/components/markdown-renderer.tsx` (delete invented-id fallback; dev-warn on miss)
- Modify: `front-end/src/shared/lib/markdown-headings.ts` (export `TOC_MAX_DEPTH = 3`; consumed by renderer + article-toc)
- Modify: `front-end/src/features/articles/lib/article-toc.ts` (use `TOC_MAX_DEPTH`)
- Modify: `front-end/src/features/articles/pages/articles-page.tsx` (remove compatibility re-exports of `extractArticleTableOfContents` / `navigateToArticleHeadingById` once the only external importer is deleted)
- Delete: `front-end/src/features/articles/pages/article-page.tsx`
- Delete: `test/front-end/src/features/articles/pages/ArticlesPage.toc-consistency.test.ts` (fs-coupled, duplicated `stripFrontmatter`)
- Delete: `test/front-end/src/features/articles/pages/ArticlePage.layout.test.ts` (tautological class-string pin)
- Delete: `test/front-end/src/features/articles/pages/article-page.test.tsx` (dead component's view tests)
- Unchanged: `article-toc-nav.tsx`, `use-article-toc.ts` (TOC navigation + active-heading logic stays in `features/articles`; it consumes only `ArticleTableOfContentsItem`)

### TDD steps

- [ ] **Step 1 (red):** `article-document.test.ts` — test `renderArticle` with the tricky fixture from the old consistency test (duplicate headings, reference-style links, inline HTML, fenced code, setext) asserts `toc[i].id` appears in `html` (`id="..."`) and `toc.map(ids)` equals the ids of the rendered `<h1..h3>`. Fails: no `article-document` module.
- [ ] **Step 2 (green):** implement `renderArticle` as above; run the single test file; then run the full suite (the old consistency test still passes — the invariant is intact).
- [ ] **Step 3 (red):** extend `article-document.test.ts` — "renderer never invents position-suffixed ids": for the same fixture set, `expect(renderedId).not.toMatch(/-\\d+-\\d+$/)` on every heading id (catches a resurrected `slug-LINE-COLUMN` fallback). Note: this passes before the refactor on these fixtures (lookups succeed) — it is a regression guard, not a failing-first test; the genuinely red step is Step 1.
- [ ] **Step 4 (refactor):** delete the invented-id fallback in `markdown-renderer.tsx`; add `console.error` on miss; introduce and use `TOC_MAX_DEPTH`. Run the new test file, then the full suite.
- [ ] **Step 5 (delete dead code):** remove `article-page.tsx` + its two tests + the compatibility re-exports. Before deleting, confirm no remaining importers via `xd://lsp` references (only `articles-page.tsx` re-export and the two test files are expected).
- [ ] **Step 6:** `bun test`, `bun run typecheck`, `bun run lint`, `bun run build` — all green. Commit `refactor(articles): single-source TOC heading ids, delete dead ArticlePage`.

### Tests written first

1. `renderArticle` returns `{ html, toc }`; every TOC id present in html; TOC id list equals rendered heading id order (tricky fixture: duplicates, setext, fences, inline html, reference links).
2. No heading id matches `/-\\d+-\\d+$/` (invented-position guard).
3. `TOC_MAX_DEPTH` honored: `h4+` gets no TOC entry and no lookup ids needed.

### Open decisions

| Decision | Options | Recommendation & rationale |
|---|---|---|
| Heading-id scheme | count-based (current) vs offset/position-based vs `slug-LINE-COLUMN` | **Count-based** stays. It is already the shared extractor's scheme and produces stable ids independent of AST internals; the position map is only a *lookup index* into it. |
| Lookup-miss policy | (a) invented `slug-LINE-COLUMN`; (b) loud dev error + deterministic base slug; (c) throw | **(b)**. (a) is the drift source; (c) breaks rendering on unforeseen content. (b) keeps content rendering while making drift visible in dev/E2E instead of silent. |
| Where `renderArticle` lives | `shared/lib` vs `features/articles/lib` | **`features/articles/lib`**. Extraction stays in `shared/lib/markdown-headings.ts` (shared with the renderer); the TOC shape + html assembly is article-feature knowledge. |
| TOC nav / active-heading location | article feature (current) vs shared | **Stays in `features/articles`** — `ArticleTocNav`, `useArticleToc`, `article-toc.ts` are already decoupled from the page shell; moving them adds churn without a consumer. |
| Survivors of the consistency test | keep fs-coupled sweep vs in-process unit test vs both | **In-process unit test only** (`renderArticle` fixture set), plus Candidate 3's interface-level `renderArticle` sweep over real content files (cheap, no `stripFrontmatter` duplication — the module under test owns body extraction). |

---

## Candidate 2 — Deepen the content normalization seam (Strong)

### Current state (verified)

`back-end/src/features/content/content.ts` `normalizeFrontmatter` (~line 104-190):
- `status`: `normalizeProjectStatus` returns `undefined` for values outside `PROJECT_STATUSES` → `content/Minimal Android Launcher.md:15` (`status: In development`) is **silently dropped**; the badge never renders and nothing errors.
- `prioritySlot`: declared on `ProjectFrontmatter` (`shared/src/index.ts`, `prioritySlot?: 1 | 2 | 3`) and consumed by `front-end/src/features/projects/lib/project-display.ts:22-37` (`resolvePriorityProjects`), but the normalizer **never emits it** — front-end tests pass only because they hand-build fixtures.
- `type`: `let type: ContentType = "article"` with a manual literal check (`content.ts:~131`) instead of `CONTENT_TYPES.includes(...)`.
- `socialImage`: present in 4 real content files (`Apt-get out of my life, hello flatpak.md:7`, `Making my work easier with notes in Obsidian.md:7`, `My operating system is a container image, yes, really.md:7`, `Yoga Nidra, a way to be at peace in chaos.md:7`), absent from the `shared` contract, never read.
- Mixed error policy: missing `category` (article) or `coverImage`/`coverImageAlt` (project) **throws** → the whole `GET /content` list route 500s; invalid `status` silently drops. 
- The normalizer is private and exercised only via `content.real.test.ts` (`items.length >= 8`, two slugs, one project's `links`/`projectOrder`). `frontmatter.ts` parser is deep and well-tested — untouched by this plan.

### Target interface

`back-end/src/features/content/content.ts` (or new `normalize.ts` next to it):

```ts
export interface ContentError {
  file: string;
  field?: string;
  message: string;
  /** The offending value, when present. */
  value?: unknown;
}

export type NormalizeResult =
  | { ok: true; value: ContentFrontmatter }
  | { ok: false; error: ContentError };

/** Total function: never throws, never silently fabricates defaults. */
export function normalizeContentDocument(file: string, raw: unknown): NormalizeResult;

/** Audit helper for the whole directory; lists every invalid document. */
export function validateContentDir(contentDir: string): Promise<ContentError[]>;
```

- `listContent` / `getContentBySlug` refactor onto `normalizeContentDocument`: invalid items are **skipped** (drop the current hard throw; one bad file must not 500 the list endpoint). Wire behavior for valid items is unchanged.
- `prioritySlot` emitted when raw value is `1 | 2 | 3`. `socialImage` normalized as optional string and added to the shared contract. `type` validated via `CONTENT_TYPES`.

### Files changed / deleted

- Modify: `back-end/src/features/content/content.ts` (normalizer → total union; `prioritySlot`; `socialImage`; `CONTENT_TYPES`-driven `type`; `validateContentDir`)
- Modify: `shared/src/index.ts` (`socialImage?: string` on `BaseContentFrontmatter`)
- Modify: `content/Minimal Android Launcher.md:15` (`status: In development` → `status: In Progress` — the enum value matching the author's intent; the new error path would otherwise flag it)
- Create: `test/back-end/src/features/content/content-normalize.test.ts`
- Modify: `test/back-end/src/features/content/content.real.test.ts` (interface-level assertions over real files)
- Modify: `test/back-end/src/features/content/content-routes.test.ts` (list route no longer 500s on an invalid document)

### TDD steps

- [ ] **Step 1 (red):** `content-normalize.test.ts` — crafted raw objects: invalid `status` → `{ ok: false, error.field === "status" }`; `prioritySlot: 2` → emitted; `prioritySlot: 4` → error; `socialImage` → passthrough; unknown `type` → defaults to `"article"`; missing `category` on an article → error **not throw**; valid project → `ok: true`.
- [ ] **Step 2 (green):** implement `normalizeContentDocument` + refactor `listContent`/`getContentBySlug` onto it; run the new test file; run the full suite (existing `content.real.test.ts` must stay green — counts/slugs unchanged once the status fix lands).
- [ ] **Step 3 (red):** `validateContentDir(CONTENT_DIR)` returns `Minimal Android Launcher.md` status error — fails because the file still says `In development`.
- [ ] **Step 4 (green):** fix `content/Minimal Android Launcher.md`; `validateContentDir` now returns `[]`.
- [ ] **Step 5 (red):** `content-routes.test.ts` — a temp dir with one invalid-status file: `GET /api/content` returns 200 and omits that item (no 500).
- [ ] **Step 6:** gates + commit `feat(content): total normalizeContentDocument seam with field errors`.

### Tests written first

1. Field-level errors: `status`, `prioritySlot`, missing `category`, missing `coverImage`/`coverImageAlt`, non-object raw.
2. `prioritySlot` 1|2|3 emitted; out-of-range rejected.
3. `socialImage` normalized into the contract.
4. `type` defaulting + `CONTENT_TYPES` validation.
5. `validateContentDir` over the real `content/` dir → empty after the status fix (guards future drift).
6. List route skips invalid docs (no 500).

### Open decisions

| Decision | Options | Recommendation & rationale |
|---|---|---|
| Error policy at the route | (a) skip invalid (drop throw); (b) `?strict=1` returns errors; (c) fail-fast 500 | **(a)** skip + `validateContentDir` as the audit seam. The wire format stays stable and one broken file can't take the whole content API down; (b) is scope creep, (c) is today's bug. |
| `prioritySlot` | emit it vs remove from contract + consumer | **Emit it.** Contract and consumer (`resolvePriorityProjects`) already exist and are tested; removing them would delete a designed feature. No real file sets it yet → no visual change, feature becomes expressive. |
| `socialImage` | add to contract vs remove from content files | **Add as optional field** (real authored data; removing loses metadata). Building OG/`<meta>` output from it is explicitly out of scope for this seam — this ticket only normalizes the contract. |
| `Minimal Android Launcher.md` status | fix file vs surface via error only | **Fix the file and assert via `validateContentDir`.** "In development" is the author's clear intent; the closest enum value is `In Progress`. The error path stays as the guard for *future* invalid values. |

---

## Candidate 3 — One shared content document + load module (Worth exploring)

### Current state (verified)

- Shapes: `ArticleData extends ArticleSummary { body }` in `front-end/src/features/articles/lib/articles-sidebar.ts` (live); `ContentData = ContentFrontmatter & { body }` + `isProjectData` in `front-end/src/features/projects/pages/project-page.tsx`; the dead `article-page.tsx` imports `ArticleData` from the articles lib (the standalone third declaration in the review no longer exists).
- Fetch wiring in 6 live consumers + 1 dead: `use-articles.ts` (2 fetches), `project-page.tsx`, `projects-page.tsx`, `home-recent-posts.tsx`, `home-start-here.tsx`, dead `article-page.tsx`. Three divergent error policies: 404→notFound (ProjectPage), error state (Articles/Projects pages), **silent empty** (`HomeRecentPosts` `setPosts([])`, `HomeStartHere` catch → empty).
- `front-end/src/features/home/lib/home-articles.ts` cross-imports `ArticleSummary` from `@/features/articles/lib/articles-sidebar` and duplicates the date sort as `sortArticleSummariesDesc` — which **differs from `compareArticles` on ties** (slug-only vs title→slug fallback). Behaviorally divergent copies.
- `shared/hooks/use-api-get.ts` exists (loading/error/data state machine) but is used only by `HelloButton`.

### Target interface

Types move to the `shared` workspace (single contract consumed by both sides):

```ts
// shared/src/index.ts (additions)
export type ArticleSummary = ArticleFrontmatter & { slug: string };
export type ArticleData = ArticleSummary & { body: string };
```

Loader in `front-end/src/shared/lib/content-loader.ts`:

```ts
export interface ContentLoader {
  listArticles(): Promise<ArticleSummary[]>;
  getArticle(slug: string): Promise<ArticleData>;
  listProjects(): Promise<ProjectFrontmatter[]>;
}

export const httpContentLoader: ContentLoader;              // apiGet-backed (prod)
export function createMemoryContentLoader(items: ContentItem[]): ContentLoader; // test double
```

Error policy (single): transport/HTTP errors reject (callers render an error state); `getArticle` rejects `ApiError(404)` → pages map 404 to `notFound`. **Home strips stop swallowing**: a fetch failure renders an inline error note, never a misleading empty list. One shared sort (`compareArticles`, single documented tie-break) lives with the types.

### Files changed / deleted

- Modify: `shared/src/index.ts` (add `ArticleSummary`, `ArticleData`)
- Create: `front-end/src/shared/lib/content-loader.ts` (+ test)
- Modify: `front-end/src/features/articles/hooks/use-articles.ts`, `lib/article-fetch.ts` (delegate to loader)
- Modify: `front-end/src/features/projects/pages/project-page.tsx`, `projects-page.tsx` (delegate to loader; shared `ProjectFrontmatter` type already in `shared`)
- Modify: `front-end/src/features/home/components/home-recent-posts.tsx`, `home-start-here.tsx` (loader + error note)
- Delete: `front-end/src/features/home/lib/home-articles.ts` (cross-feature import + duplicated sort; move sort to shared lib next to the types)
- Delete: dead `ArticlePage` fetch (already covered by Candidate 1's deletion)
- Keep: `shared/lib/api.ts` (`apiGet`) untouched; `useApiGet` stays as the component-layer lifecycle for single-shot loads (HelloButton only; optionally adopted by home strips in the same migration)

### TDD steps

- [ ] **Step 1 (red):** `content-loader.test.ts` — `httpContentLoader.listArticles` requests `ROUTES.CONTENT?type=article` and drops slug-less rows (mirror existing `article-fetch.test.ts` assertions); `createMemoryContentLoader` returns fixture items, and `getArticle` of an absent slug rejects with `ApiError(404)`. Fails: module missing.
- [ ] **Step 2 (green):** implement loader; run file; full suite (existing article-fetch tests still green — they exercise the same paths).
- [ ] **Step 3 (migrate articles):** `use-articles.ts` + `article-fetch.ts` onto the loader; full suite green.
- [ ] **Step 4 (migrate projects):** `project-page.tsx`, `projects-page.tsx` onto the loader; existing project tests green.
- [ ] **Step 5 (migrate home, red first):** failing test — `HomeRecentPosts` catch no longer renders an empty list; assert an error note renders when the loader rejects. Implement: error note; delete `home-articles.ts`; home imports the shared sort/type.
- [ ] **Step 6 (delete duplication):** remove `sortArticleSummariesDesc` and `compareArticles` divergent copies → one shared sort (pick the tie-break, see decisions); update `home-articles.test.ts` to the shared sort.
- [ ] **Step 7:** gates + commit `refactor(content): single ContentLoader + shared article types`.

### Tests written first

1. `httpContentLoader` request paths + slug filtering (adapter-level).
2. `createMemoryContentLoader` list/get/404 (the seam that makes every consumer test HTTP-free).
3. Home strips: loader rejection → error note, not empty list (behavior change).
4. Shared sort: desc by date; ties by documented tie-break.

### Open decisions

| Decision | Options | Recommendation & rationale |
|---|---|---|
| Single shape | `ArticleData extends ArticleSummary { body }` (current live shape) vs `ContentData` union | **Live articles shape wins.** `ContentFrontmatter | { body }` union forces `isProjectData` guards everywhere; the articles shape is exact for its consumers and composes with Candidate 1's `renderArticle(markdown)`. `ProjectData` stays a local projection in `features/projects` (covers both projects consumers). |
| Error policy | 404→notFound / error state / silent empty | **404→notFound for single-item, error state for lists, never silent empty.** Silent `[]` hides outages behind an empty homepage section; a note is honest and cheap. |
| Module location | `front-end/src/shared/lib` vs `shared` workspace | **Types: `shared` workspace** (single contract, back-end `ArticleFrontmatter` already there). **Loader: `front-end/src/shared/lib`** (HTTP is a front-end concern; `api.ts` lives there). |
| Adapter seam | injected `ContentLoader` interface | **Interface + two implementations.** Tests stop mocking global `fetch`; `createMemoryContentLoader` also gives home tests real data flow. |
| Migration order | top-down (loader first) vs bottom-up | **Loader + shared sort first, then articles → projects → home → dead-code deletion.** Each step lands with a green full suite; breaking the dead `ArticlePage` fetch out of the count keeps the diff honest. |
| Sort tie-break | title→slug (articles' `compareArticles`) vs slug-only (home's `sortArticleSummariesDesc`) | **title→slug.** It's the longer-standing articles behavior with existing test coverage; home's slug-only copy is the younger divergence. |

---

## Candidate 4 — Give the home section a module (Worth exploring)

### Current state (verified)

- One `HomeSectionId` is simultaneously: DOM id (`home-section-shell.tsx:22`), URL hash (`home-page.tsx` `activateSectionAnchor` → `#${sectionId}`, CTA `href={"#" + ctaTargetId}`), nav key (`home-floating-nav.tsx`), observer key (`use-active-home-section.ts` `document.getElementById(id)`). The id *is* already the shared key — that part of the finding is structurally fine; what drifts is everything derived from it:
- String-matching dispatch: `home-section.tsx:71` `if (section.id === "start")` in the `default` branch instead of a declared variant; `isDiscoverCta = ctaLabel?.toLowerCase() === "discover"` duplicated in `home-section-start.tsx:19` and `home-section-default.tsx:18` (only the `start` section actually defines `ctaLabel`, so the check fires for one row of config).
- `HOME_NAV_ICONS: Record<HomeSectionId, LucideIcon>` — a parallel registry in `home-floating-nav.tsx`; exhaustive by construction (union-typed) but unkeyed from config.
- `${section.id}-heading` hand-spread at 9+ sites: `home-section.tsx:32,43,54,64`, `home-section-carousel.tsx:27`, `home-section-default.tsx:31`, `home-section-start.tsx:31`, `home-section-footer.tsx:18,26`, `home-section-shell.tsx:22`.
- The section frame (`<section id aria-labelledby> + min-h-svh classes + bgColor`) is re-implemented in 5 components instead of using `HomeSectionShell`: `home-section-footer.tsx` (own `<footer>`), `home-recent-posts.tsx:80-83`, `home-start-here.tsx:101-104`, `home-trust-strip.tsx:28-31`, `home-workflow-rows.tsx:30-33` — one identical className string copied 4×. Only `carousel`/`default`/`start` use the shell.

### Target interface

- Config declares the hero explicitly: `variant: "start"` on the `start` section (config keeps `ctaLabel`/`ctaTargetId`).
- `HomeSection` dispatches on variant only — `case "start":` → `HomeSectionStart`; the `default:` branch loses its `section.id === "start"` check; `isDiscoverCta` checks deleted (hero styling keyed to the `start` variant, not a label string).
- One id-derivation seam:

```ts
// front-end/src/features/home/config/home-sections.ts
export function headingIdFor(sectionId: HomeSectionId): string {
  return `${sectionId}-heading`;
}
```

  Every `aria-labelledby` and `<h2 id>` derives from it — DOM id == hash == nav key == observer key == heading id are all projections of `HomeSectionId`.
- `HomeSectionShell` becomes the single frame for **all** variants: gains `as?: "section" | "footer"` (footer keeps `<footer>` semantics) and optional `headingId`/`heading`/`body` props so heading markup lives in the shell once. The 5 re-implementing components render content only.

### Files changed / deleted

- Modify: `front-end/src/features/home/config/home-sections.ts` (`variant: "start"`; `headingIdFor`)
- Modify: `front-end/src/features/home/components/home-section.tsx` (`case "start"`; delete id/label string matching)
- Modify: `front-end/src/features/home/components/home-section-shell.tsx` (`as` + heading props)
- Modify: `home-section-start.tsx`, `home-section-default.tsx` (delete `isDiscoverCta`; use shell heading props)
- Modify: `home-section-footer.tsx`, `home-recent-posts.tsx`, `home-start-here.tsx`, `home-trust-strip.tsx`, `home-workflow-rows.tsx` (wrap in shell; content only)
- Modify: `home-floating-nav.tsx`, `use-active-home-section.ts` (unchanged behavior; `HOME_NAV_ICONS` stays — see decisions)
- Tests: modify `test/front-end/src/features/home/components/HomeSection.test.tsx` + `HomeFloatingNav.test.tsx` as needed; add `headingIdFor` assertions

### TDD steps

- [ ] **Step 1 (red):** `HomeSection.test.tsx` — config fixture with `variant: "start"` renders the hero (portrait testid), and a `default`-variant section with `id: "start"` **no longer** renders as hero (proves the id check is gone). Currently the default branch keys on the id → this second assertion fails.
- [ ] **Step 2 (green):** add `variant: "start"` to config + `case "start"` in `HomeSection`; delete the id check; full suite.
- [ ] **Step 3 (red):** `headingIdFor` test — every section in `HOME_SECTIONS` renders `<section id={section.id} aria-labelledby={headingIdFor(section.id)}>` and one `<h2 id={headingIdFor(section.id)}>`; fails today for footer/recent-posts/start-here/trust/workflow (own-frame components use the same string, so the failure is about *frame uniformity* — assert the frame markup/data-* attributes instead of refuting the string, to avoid a tautology).
- [ ] **Step 4 (green/refactor):** shell `as` + heading props; migrate the 5 components; delete `isDiscoverCta`; full suite.
- [ ] **Step 5:** gates + commit `refactor(home): variant-driven sections with one heading-id seam`.

### Tests written first

1. Variant dispatch: `variant: "start"` → hero; non-start id + default variant → default render (deletes the id/label string matching).
2. `headingIdFor` = `${id}-heading`; every `HOME_SECTIONS` entry renders with that aria-labelledby.
3. All variants render exactly one frame element with the section id (uniformity guard).

### Open decisions

| Decision | Options | Recommendation & rationale |
|---|---|---|
| Variant set | add explicit `"start"` vs richer `ctaStyle` field | **Add `"start"`.** The hero is a distinct renderer already; a declared variant kills the id check. `ctaLabel.toLowerCase() === "discover"` styling stays folded into the hero variant (only the `start` row defines a CTA today — verified in config). |
| `headingIdFor` location | config vs types file | **`config/home-sections.ts`** — same module as `HOME_SECTIONS`, keeps the derivation next to the data it names. |
| `HOME_NAV_ICONS` | merge into config vs stay in nav component | **Stay in `home-floating-nav.tsx`** as a union-typed `Record<HomeSectionId, ...>` (already exhaustive by construction). Icon choice is nav UI; pulling lucide into data config couples UI lib with renderless consumers/tests. |
| Shell | one shell for all variants vs keep footer/recent/start-here/trust/workflow frames | **One shell** (`as` prop for footer semantics). The 5 copies already share the exact same className + id wiring; a single frame makes the DOM-id/aria-labelledby invariant structural. |

---

## Candidate 5 — Concentrate content asset serving (Speculative)

### Current state (verified)

- `IMAGE_EXTENSIONS` (`back-end/src/features/content/obsidian.ts:1`) duplicates the keys of `IMAGE_MIME_TYPES` (`back-end/src/features/content/content-routes.ts:10-18`); both lists match (incl. `.avif`).
- The image route's traversal guard `isPathInsideRoot` (`content-routes.ts:20-23`), MIME mapping, and cache header live in the route handler.
- **Stale claim:** `test/back-end/src/features/content/content-routes.test.ts` already covers through HTTP: happy 200 + `content-type` + `cache-control: immutable`, unknown-file 404, `%2e%2e` traversal 404 (via `app.inject` on a temp content dir — the adapter seam already exists).
- Remaining gaps (verified by reading the handler): (1) an `EISDIR` — requesting the images **directory** (or a subdirectory path) passes `isPathInsideRoot`, then `readFile` throws `EISDIR` which is **not** in the `ENOENT`/`ENOTDIR` catch → HTTP 500; (2) a non-image extension (e.g. `/pixel.md`) → MIME lookup 404 (handled, untested); (3) double-encoded traversal (`%252e%252e%252f`): single `decodeURIComponent` leaves a literal `%2e` filename → resolve/guard → 404 (safe; untested); (4) the MIME map itself has no exhaustive test.

### Target interface

`back-end/src/features/content/image-assets.ts` (new):

```ts
/** Single source: extension → MIME. Everything else derives. */
export const IMAGE_MIME_TYPES: Readonly<Record<string, string>> = { … };

export const IMAGE_EXTENSIONS: readonly string[] = Object.keys(IMAGE_MIME_TYPES);

export const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable"; // immutable names, 1y

export interface ResolvedAsset {
  fullPath: string;
  contentType: string;
}

/** decode → traversal-guard (isPathInsideRoot) → MIME lookup; null on any miss. */
export function resolveContentAsset(imageRoot: string, rawPath: string): ResolvedAsset | null;
```

- `obsidian.ts` imports `IMAGE_EXTENSIONS` from `image-assets.ts` (rewrite behavior unchanged). `registerContentImageRoutes` keeps only the I/O: `resolveContentAsset` → `readFile` → reply (and the `EISDIR`/`ENOENT`/`ENOTDIR` → 404 mapping).

### Files changed / deleted

- Create: `back-end/src/features/content/image-assets.ts`
- Modify: `back-end/src/features/content/obsidian.ts` (import extension list)
- Modify: `back-end/src/features/content/content-routes.ts` (thin handler; EISDIR → 404)
- Modify: `test/back-end/src/features/content/content-routes.test.ts` (new edge cases)

### TDD steps

- [ ] **Step 1 (red):** `content-routes.test.ts` additions — (a) `GET /content-assets/images/` and `/content-assets/images/subdir/` → 404 **not 500** (fails: today 500 via EISDIR); (b) `/content-assets/images/pixel.md` → 404; (c) double-encoded traversal `/content-assets/images/%252e%252e%252fpasswd` → 404; (d) exhaustive MIME map: each `IMAGE_EXTENSIONS` entry maps to its expected `content-type` for a served fixture.
- [ ] **Step 2 (green):** extract `image-assets.ts`; handler catches `EISDIR`; `readFile` stays behind the resolve call; run file + full suite (existing happy/traversal tests remain green — behavior preserved).
- [ ] **Step 3:** unit test `resolveContentAsset` table (ok paths, traversal `..`, absolute path, non-image ext, dir path) so the guard is tested without HTTP too.
- [ ] **Step 4:** gates + commit `refactor(content): single image MIME map + guarded resolve seam`.

### Tests written first

1. Directory request → 404 (EISDIR fix, through HTTP).
2. Non-image extension → 404.
3. Double-encoded traversal → 404.
4. MIME matrix: every extension serves the right `content-type`.
5. `resolveContentAsset` unit table incl. `..` segments, absolute paths, empty raw path.

### Open decisions

| Decision | Options | Recommendation & rationale |
|---|---|---|
| Extension + MIME invariant | one map + derived list (recommended) vs one list + derived map vs keep both | **One `Record<extension, MIME>` map, `IMAGE_EXTENSIONS = Object.keys(...)`.** A map is the richer truth and derivation can't drift; keep the public `IMAGE_EXTENSIONS` name so `obsidian.ts` reads unchanged. |
| Guard placement | inside `resolveContentAsset` vs in handler | **Inside the resolver** — the guard and MIME check are pure path logic; the handler is then I/O-only and fully testable via `app.inject` + unit table. |
| Cache policy | current immutable 1y vs per-type vs no cache | **Keep `public, max-age=31536000, immutable`** — asset filenames are content-addressed in practice (fixed paths in content), so immutability is safe and the header is already pinned by an existing test; move the constant to `image-assets.ts` so it's documented next to the resolver. |

---

## Recommended sequence & dependencies

1. **Candidate 2** — normalization seam first: fixes the contract (`socialImage`) and real-data correctness that Candidates 1/3 build on.
2. **Candidate 3** — shared article types + `ContentLoader` (Candidate 1's `renderArticle` consumes `ArticleData`).
3. **Candidate 1** — `renderArticle` on the shared shape; deletes `ArticlePage` dead code (also deletes the duplicate fetch Candidate 3 would otherwise migrate).
4. **Candidate 4** — home section module; independent of 1-3.
5. **Candidate 5** — asset serving; independent of 1-4.

Candidates 2 and 5 stay separate seams of the same pipeline (normalization vs asset serving) as the review notes.

## Follow-up issues

Each candidate becomes its own tracking issue (created from this ticket) with a link to its section above; close order follows the sequence. This keeps the review's own TDD rule — one failing test at a time — intact at the issue level: each plan is independently shippable and testable.