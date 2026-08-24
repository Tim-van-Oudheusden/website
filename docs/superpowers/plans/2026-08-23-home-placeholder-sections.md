# Home Placeholder Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 4 open content decisions under epic `website-6ohv` (proof, for-devs, community-and-docs, secondary-cta) by replacing placeholder copy with real, config-driven home page sections.

**Architecture:** Each section stays config-driven via `home-sections.ts` and dispatches to a dedicated render component from `HomeSection.tsx` through a new `HomeSectionVariant`. Decorative data (feature rows, trust items) lives in config; list-driven sections (recent posts, start-here) fetch real articles from the existing content API via `shared/lib/api.ts`.

**Tech Stack:** Bun TS project, React 19, react-router (`<Link>`), Tailwind v4 CSS vars (`(--x)` syntax), shadCN primitives, bun:test (render-to-markup snapshot tests).

**Spec:** Beads issues `website-v13a`, `website-w9w5`, `website-5xom`, `website-0p1u` (acceptance criteria define each section). See `docs/superpowers/specs/2026-06-10-projects-page-design.md` for the panel/layout conventions.

## Global Constraints

- No new dependencies.
- Use existing Tailwind CSS vars and shadCN primitives only; stay within `front-end/src/features/home`.
- All real content must link to existing `/articles/:slug` routes; no fabricated channels/metrics/testimonials.
- Content must reflect real repo material (Obsidian pipeline, container-OS, Pi sandbox, Linux, meditation). No invented tools.
- Follow repo TDD: write the failing test first, confirm it fails, implement, confirm it passes, run the full suite, then commit. Conventional Commits.
- Quality gates: `bun test`, `bun run typecheck`, `bun run lint`, `bun run build` must pass.
- **PREREQ:** Never modify new test assertions to force a pass. Stale pre-existing assertions (Tailwind v3 → v4 drift) are corrected in Task 0 to track the committed implementation, not to mask a real failure.

---

### Task 0: Repair stale pre-existing CSS-variable test assertions

On 2026-06-11 `fix(home): css variable usage` migrated the source to Tailwind v4 `(--x)` shorthand, but `HomeSection.test.tsx` and `HomeFloatingNav.test.tsx` still assert v3 `[var(--x)]`. These 7 failures predate this epic and block the full-suite acceptance gate.

**Files:**
- Modify: `front-end/src/features/home/components/HomeFloatingNav.test.tsx`
- Modify: `front-end/src/features/home/components/HomeSection.test.tsx`

- [ ] **Step 1:** In `HomeFloatingNav.test.tsx` replace the three stale assertions with the committed source's classes:
  - `bg-[var(--adw-dark-5)]` → `bg-(--adw-dark-5)` (appears in 2 tests)
  - `dark:bg-[var(--adw-page-brown-bg)]` → `dark:bg-(--site-section-well-bg)` (the nav container's dark surface is the themed well, per commit `06a0929`)

- [ ] **Step 2:** In `HomeSection.test.tsx` map each stale assertion to its committed v4 equivalent:
  - `bg-[var(--site-section-well-bg)]` → `bg-(--site-section-well-bg)` and every `text-[var(--adw-*)]` → `text-(--adw-*)`
  - `min-h-[29rem]` → `min-h-(--...)` (source uses `min-h-296` palette step `min-h-116`); update to the exact source token `min-h-116`
  - `pl-[1.875rem]` → `pl-7.5`, `lg:pl-[2.25rem]` → `lg:pl-9`
  - `lg:max-w-[74rem]` → `lg:max-w-296`, `lg:max-w-[83rem]` → `lg:max-w-332`

- [ ] **Step 3:** Run `bun test front-end/src/features/home/components/HomeFloatingNav.test.tsx front-end/src/features/home/components/HomeSection.test.tsx` — confirm 0 of these 7 fail (assertions now match committed source).

- [ ] **Step 4:** Commit `test(home): align stale css-variable assertions with v4 migration`.

---

### Task 1: Extend HomeSection types + config for the new sections

**Files:**
- Modify: `front-end/src/features/home/types/home-section.ts`
- Modify: `front-end/src/features/home/config/home-sections.ts`

**Interfaces:**
- Produces: `HomeSectionVariant` gains `"workflow" | "trust-recent"` etc; `HomeSectionDefinition` gains optional `features?: HomeFeatureRow[]` and `trustItems?: string[]`.
  - `HomeFeatureRow { title: string; description: string; mediaLabel: string }`
  - Trust items are plain strings rendered as centered chips/list.

- [ ] **Step 1:** Extend the variant union:
```ts
export type HomeSectionVariant =
  | "default" | "carousel" | "footer" | "workflow" | "trust" | "recent-posts" | "start-here";
```
- [ ] **Step 2:** Add optional data fields to `HomeSectionDefinition`:
```ts
export interface HomeFeatureRow { title: string; description: string; mediaLabel: string; }
// fields: features?: HomeFeatureRow[]; trustItems?: string[];
```
- [ ] **Step 3:** In `home-sections.ts` set real copy and wire the new variants (real content, no fabricated claims). `for-devs` gains `variant: "workflow"` + `features`; `proof` gains `variant: "trust"` + `trustItems`; `community-and-docs` and `secondary-cta` gain their variants.
- [ ] **Step 4:** Run full `bun test` (still green) + `typecheck`.

---

### Task 2: proof section — lightweight honest trust strip (`website-w9w5`)

**Files:**
- Create: `front-end/src/features/home/components/HomeTrustStrip.tsx`
- Create: `front-end/src/features/home/components/HomeTrustStrip.test.tsx`
- Modify: `front-end/src/features/home/components/HomeSection.tsx`

**Interfaces:**
- Consumes: `section.trustItems: string[]`, `section.heading`, `section.body`, `section.bgColor`
- Produces: `HomeTrustStrip({ headingId, heading, body, items })` — a rendered section whose items are honest statements.

- [ ] **Step 1:** Write failing test that renders the trust strip with fixture items and asserts each claim present and no fabricated numbers (`0` matches, no "testim", no download counts).
- [ ] **Step 2:** Run to confirm fail (component not defined).
- [ ] **Step 3:** Implement `HomeTrustStrip` (centered column, one chip/list per `trustItems`, wrapped in a `<section>` with the shared aria-labelledby + themed bg from `--site-section-well-bg`).
- [ ] **Step 4:** Wire the `trust` variant in `HomeSection.tsx` to `HomeTrustStrip`.
- [ ] **Step 5:** Test passes; `bun test`; `bun run typecheck`; `bun run lint`; commit `feat(home): implement honest proof trust strip (website-w9w5)`.

### Task 4: for-devs section — 'how I work' workflow feature rows (`website-v13a`)

**Files:**
- Create: `front-end/src/features/home/components/HomeWorkflowRows.tsx`
- Create: `front-end/src/features/home/components/HomeWorkflowRows.test.tsx`
- Modify: `front-end/src/features/home/components/HomeSection.tsx`

**Interfaces:**
- Consumes: `section.features: HomeFeatureRow[]`, heading, body, bgColor.
- Produces: `HomeCols` alternating equal-width feature rows (media slot + description), responsive, in a row-direction section.

- [ ] **Step 1:** Failing test asserts the two real rows ("Obsidian content pipeline", "Pi sandbox automation") render with their media placeholder slots and alternating order, and no "Placeholder alternating feature" copy remains.
- [ ] **Step 2:** Run to confirm fail.
- [ ] **Step 3:** Implement (maps `features` to alternating rows; media slot—empty `Media placeholder`-style label inside each; text/description present).
- [ ] **Step 4:** Wire `"workflow"` variant in `HomeSection`.
- [ ] **Step 5:** Pass + full gates + commit `feat(home): add how-I-work workflow rows (website-v13a)`.

### Task 5: community-and-docs — recent blog posts strip (`website-5xom`)

**Files:**
- Create: `front-end/src/features/home/components/HomeRecentPosts.tsx`
- Create: `front-end/src/features/home/components/HomeRecentPosts.test.tsx`
- Create: `front-end/src/features/home/lib/home-articles.ts` (fetch + sort helper)
- Modify: `front-end/src/features/home/config/home-sections.ts` (heading/copy for the section)

**Interfaces:**
- Consumes: `apiGet<ArticleSummary[]>(CONTENT?type=article)`.
- Produces: pure `RecentPostsList({ posts })` render component; each link `/artarticles/:slug`. `sortArticleSummariesDesc(articles)` latest-N helper.

- [ ] **Step 1:** Test `sortArticleSummaries(a, b)` with dates returns desc; test `RecentPostsList` links to `/articles/` for given titles with `Link`.
- [ ] **Step 2:** confirm fail.
- [ ] **Step 3:** implement sort helper + `RecentPostsList` (grid of cards, link each to `/articles/title:slug`).
- [ ] **Step 4:** wire `"recent-posts"` variant → fetch + render in `HomeRecentPosts`.
- [ ] **Step 5:** full gates + commit `feat(home): recent blog posts strip (websites-5xom)`.

### Task 6: secondary-cta — 'Start here' curated reading list (`website-0p1u`)

**Files:**
- Create: `front-end/src/features/home/components/HomeStartHere.tsx`
- Create: `front-end/src/features/home/components/HomeStartHere.test.tsx`
- Modify: `front-end/src/features/home/config/home-sections.ts`

**Interfaces:**
- Consumes: curated slug list (config const `HOME_START_HERE_SLUGS`).
- Produces: `resolveStartHere(articles, slugs)` returns ordered selected articles; `StartHereLinks({ items })` column list of real links.

- [ ] **Step 1:** Test resolver picks/orders given curated slugs and `StartHereLinks` renders each title → `/articles/:slug`.
- [ ] **Step 2:** confirm fail.
- [ ] **Step 3:** implement resolver + column list.
- [ ] **Step 4:** wire `"start-here"` variant.
- [ ] **Step 5:** full gates + commit `feat(home): start here best-reads list (website-0p1u)`.

### Task 7: Final verification + close

- [ ] Run `bun test`, `bun run typecheck`, `bun run lint`, `bun run build` — all green.
- [ ] Optional E2E: `bun run dev` with Docker, spot-check each section renders; shut down when done.
- [ ] `bd plugin` the 4 open sub-issues as closing after their commits, `bd dolt push`, then Git push.