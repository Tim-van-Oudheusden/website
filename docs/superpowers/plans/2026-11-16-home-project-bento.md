# Home Project Bento Grid Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay out the home page's "Open-source projects" section (`for-devs`) as a bento grid now that five
projects have covers (#1276). This follows Option B of
[`research/buildwithtim_homepage_benchmark.md`](../../../research/buildwithtim_homepage_benchmark.md) (lines 253–268):
one large featured card, then the other projects in tiles of mixed sizes.

**Architecture:** No new frontmatter field, no new dependency and no back-end change. Frontmatter (`prioritySlot`,
`featured`, `projectOrder`) sets the order, and a project's place in that order sets its tile. A pure function in
`front-end/src/features/home/lib/showcase-projects.ts` maps the order to tile sizes. The grid stays a CSS grid that
responds to its own width (container queries), as it does now.

**Tech Stack:** React 19, Tailwind CSS v4 container queries, `bun:test`, Playwright.

## Where it stands

- `selectShowcaseProjects` returns the featured project (`resolveFeaturedProject`) and at most four more in
  `sortProjectsForDisplay` order. With today's content that is Pindu OS, Pindu launcher, Dailies, Minimal Android
  Launcher and Obsidian Content Pipeline.
- `HomeProjectShowcase` puts them on a 12-column grid. The featured card spans the full width, and from a 42rem grid it
  becomes a row with the cover on the right. From 42rem the other four are half width, so they form a 2×2 block under
  it. Nothing changes above 42rem.
- All five covers in `public/images/projects/` are 1600×1000 (16:10), with the name, tagline and repository link
  centred. The home page crops the featured cover to 11:6 and the others to 4:3. The Projects page uses 16:10 for its
  featured card and 4:3 for its gallery.
- The home lead reads `featured` only. The Projects page's "Featured project" section reads `prioritySlot` first and
  falls back to `featured` (`resolvePriorityProjects`). No project sets `prioritySlot` today, so both pages lead with
  Pindu OS, but setting a slot would make them disagree.

## 1. Which projects get the large tiles

A project's rank sets its tile, and frontmatter sets the rank. There is no new field.

| Rank | Comes from | Tile |
|---|---|---|
| 1 | `prioritySlot: 1`, else the `featured: true` project, else the first in display order | Lead, full width |
| 2 | `prioritySlot: 2`, else the next in display order | Wide (two of three columns) |
| 3 | `prioritySlot: 3`, else the next in display order | Standard |
| 4 | The next in display order | Standard |
| 5 | The next in display order | Wide |

- The home lead becomes the Projects page's primary project, because both read `resolvePriorityProjects`. Projects in
  slots 2 and 3 follow in slot order, then the rest in `sortProjectsForDisplay` order. Each project appears once, and
  the limit stays at five (the featured project and four more).
- Sizes follow from position. After the lead, tiles pair up in rows of two that alternate wide–standard and
  standard–wide, and a lone last tile spans its row, so no row has a gap at any count. To give a project a larger
  tile, move it up with `prioritySlot` or `projectOrder`.
- A `tileSize` field is not worth adding. It would need back-end validation, a row in
  [`content-authoring.md`](../../content-authoring.md), and a rule for sizes that leave gaps in the grid. Position
  already gives a fixed order of importance.
- Rank 5 gets a wide tile while ranks 3 and 4 get standard ones. That is the price of keeping every row full. The
  alternation reads as rhythm, not ranking; the lead card and the reading order carry the ranking.

Sizes by the number of projects shown (n, lead included):

| n | Sizes |
|---|---|
| 0 | none |
| 1 | full |
| 2 | full, full |
| 3 | full, wide, standard |
| 4 | full, wide, standard, full |
| 5 | full, wide, standard, standard, wide |

A full tile spans its row and lays out like the featured card does now: the cover beside the text.

## 2. Responsive grid and cover crops

Breakpoints measure the grid's own width (`@container/grid`), as now. The section frame is at most 42rem wide on
phones, 48rem from `md`, and up to 74rem (`lg:max-w-296`) from `lg`, inside `lg:px-6` padding.

| Grid width | Columns | Full | Wide | Standard |
|---|---|---|---|---|
| Below 42rem (phones) | 1 | Stacked | Stacked | Stacked |
| `@2xl/grid`, 42rem (tablets, `lg` up to 1071px) | 2 | Whole row, cover beside the text | 1 column, stacked | 1 column, stacked |
| `@5xl/grid`, 64rem (viewport about 1072px and wider) | 3 | Whole row, cover beside the text | 2 columns, cover beside the text | 1 column, stacked |

With today's five projects:

```text
Desktop (grid 64rem and wider, 3 columns)     Tablet (42–64rem, 2 columns)   Phone (below 42rem)
+-------------------------------------------+  +---------------------------+  +-------------+
| Pindu OS (full: text | cover)             |  | Pindu OS (full)           |  | Pindu OS    |
+----------------------------+--------------+  +-------------+-------------+  +-------------+
| Pindu launcher (wide)      | Dailies      |  | Pindu       | Dailies     |  | Pindu       |
| text | cover               | (standard)   |  | launcher    |             |  | launcher    |
+--------------+-------------+--------------+  +-------------+-------------+  +-------------+
| Minimal      | Obsidian Content Pipeline  |  | Minimal     | Obsidian    |  | Dailies     |
| Android      | (wide)                     |  | Android     | Content     |  +-------------+
| Launcher     | text | cover               |  | Launcher    | Pipeline    |  | Minimal ... |
+--------------+----------------------------+  +-------------+-------------+  +-------------+
                                                                              | Obsidian ...|
                                                                              +-------------+
```

- The 3-column grid starts at 64rem, which keeps a standard tile at least 325px wide (64rem less two 1.5rem gaps,
  divided by three). At the 74rem maximum it is 379px.
- From 42rem to 64rem the layout is today's, except that a lone last tile spans its row instead of leaving a gap.
- The tiles in a row share its height (grid stretch). A wide tile, with the cover beside the text, is shorter than the
  stacked standard tile next to it, so it centres its content vertically, as the featured card already does.
- The order in the DOM is the reading order: no CSS `order` and no `grid-auto-flow: dense`. Each tile keeps its
  "Learn more: <title>" link to `/projects/<slug>`.

**Covers: every tile shows the cover in an `aspect-16/10` box with `object-cover`.** A 16:10 cover is then shown whole
at every tile size. The bento changes the size of the tile, not the crop.

The covers are centred compositions of text, so cropping them cuts text. Measured on the five 1600×1000 files, the
text and icons stay between x 129 and x 1474 (the Obsidian Content Pipeline title) and between y 127 and y 917 (the
Pindu OS icon and repository pill). A centred crop is safe only for ratios from 1.35 (keeping 1348 of 1600px wide) to
1.92 (keeping 834 of 1000px high). 3:2, 16:10, 16:9 and today's 11:6 are inside that range; 4:3, 1:1 and 2:1 are not.
Today's 4:3 cards keep only x 133–1467, which cuts about 4px off the "O" and 7px off the final "e" of the Obsidian
Content Pipeline title. Using one ratio everywhere is the simplest rule that never cuts text, and it needs no focal
point per project.

## 3. The Projects page

Keep its "Featured project" and "More projects" sections. The Projects page is the full index, with status, tags,
`info` and every project. The home bento is a five-tile teaser that links there with "See all projects", and giving
both pages the same grid would only repeat it.

Two small changes:

- The gallery cards move from 4:3 to 16:10, under the cover rule above.
- After task 1, the home lead and the Projects page's primary project come from the same function, so `prioritySlot`
  and `featured` mean the same on both pages. The `prioritySlot` and `featured` rows in
  [`content-authoring.md`](../../content-authoring.md) say so.

## 4. Tests

Unit tests (`bun:test`, `test/front-end/src/features/home/lib/showcase-projects.test.ts`):

- Selection (task 1): a `prioritySlot: 1` project leads even when another project is `featured`; slots 2 and 3 follow
  in slot order before the rest. The existing tests stay: with no slot set, the featured project leads, and there are
  at most five projects, none repeated.
- Tile sizes (task 2): one table-driven test checks that the sizes for n = 0 to 5 match the table in section 1. Sizes
  are checked through the pure function and the rendered geometry, never through class strings.

E2E tests (Playwright) extend the existing tests instead of adding specs. Every page load that reads projects spends
back-end requests from the shared 50-per-minute rate-limit bucket, which the suite already mostly uses.

- In the showcase test in `e2e/home-placeholder-sections.e2e.ts` (task 2), at 1440×900:
  - The five `h3` titles appear in order (already asserted).
  - Every "Learn more: <title>" link points at `/projects/<slug>`.
  - Pindu launcher and Dailies share a top edge, and Pindu launcher's width is two Dailies widths plus the gap.
    Minimal Android Launcher and Obsidian Content Pipeline share the next row, with Obsidian the wide one.
  - Every cover box in the section is 16:10.
- Then, on the same page at 390×844, the five tiles share one left edge, in the same order.
- In `e2e/projects-page.e2e.ts` (task 3), every gallery cover box is 16:10.

## Order and issues

| Task | Issue | Blocked by |
|---|---|---|
| 1. The home lead follows `resolvePriorityProjects` | #1279 | — |
| 2. The bento layout of the home showcase | #1281 | #1279 (same file) |
| 3. Projects page gallery covers at 16:10 | #1280 | — |

## Global Constraints

- No new dependencies and no frontmatter change.
- TDD per `AGENTS.md`: one failing test at a time, confirmed failing for the right reason, then the full suite.
- Quality gates for every task: `bun run test`, `bun run typecheck`, `bun run lint`, `bun run duplication`,
  `bun run build`. E2E runs through `scripts/e2e.sh` on a podman host.
- One task = one GitHub issue = one branch `<type>/<number>-<slug>` = one PR with `Fixes #<number>`.
- Task 2's PR includes screenshots of light and dark mode at 1440 and 1072px wide, and updates row 3 of the home page
  map in `BRANDING.md` §7.
- Out of scope: hover cards, the shadcn `aspect-ratio` component (Tailwind's `aspect-16/10` already does this), more
  than five tiles, and a focal point per project.
