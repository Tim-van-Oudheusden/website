# Articles Right-Side TOC Options (Stack-Aware Research)

Date: 2026-02-19

## Current Stack Snapshot

- Frontend: React `19.2.4`, React Router `7.13.0`, Tailwind CSS `4.1.18`
- Markdown rendering: `react-markdown@10.1.0` with `remark-gfm@4.0.1` and `rehype-highlight@7.0.2`
- Backend content source: Fastify + `gray-matter`; backend returns frontmatter + raw markdown body
- Relevant files:
  - `front-end/src/shared/components/MarkdownRenderer.tsx`
  - `front-end/src/features/articles/pages/ArticlesPage.tsx`
  - `back-end/src/features/content/content.ts`

## Requirement

Add a right-side Table of Contents (TOC) for article pages with clickable entries that jump to heading sections in the article body.

## Option 1: Rehype Slugs + Client TOC Component (Recommended)

### Idea

1. Add heading IDs during markdown-to-HTML render with `rehype-slug`.
2. Build a TOC array from heading nodes (H2/H3) and render it in a right-side panel.
3. TOC links use `href="#heading-id"` for native in-page jump.

### Why it fits this codebase

- `react-markdown` already supports rehype plugins and component overrides.
- Smallest conceptual change to current rendering pipeline.
- Keeps markdown source clean (no required author-maintained TOC block).

### Tradeoffs

- Requires at least one new dependency (`rehype-slug`).
- For a "current section" highlight, add an `IntersectionObserver` hook.

### Implementation notes

- Right TOC container: desktop-only sticky column.
- Add `scroll-margin-top` to headings so jump targets are not hidden behind sticky top bar.
- If adding heading links inside article headings, pair with `rehype-autolink-headings`.

## Option 2: Full Auto-TOC Plugin (`@jsdevtools/rehype-toc`)

### Idea

Use a single rehype plugin to generate TOC HTML from headings.

### Why it fits

- Fastest way to generate nested TOC without writing extraction logic.
- Plugin is intended for TOC generation from headings.

### Tradeoffs

- Less control over output structure/styling unless heavily customized.
- Additional dependency surface.

## Option 3: Markdown-Authored TOC (`remark-toc`)

### Idea

Authors place a `## Contents` heading (or configured heading), and `remark-toc` injects/updates a TOC list in markdown output.

### Why it fits

- Mature remark plugin.
- Works well if TOC should appear in article body itself.

### Tradeoffs

- Best for in-content TOC, not a persistent right-side layout TOC.
- Requires author/content convention (or build-time transform discipline).

## Option 4: Backend-Computed TOC Metadata

### Idea

Parse markdown on backend and return structured heading metadata alongside article body (for example: `[{ depth, value, id }]`).

### Why it fits

- Single source of truth for heading structure.
- Frontend TOC component stays very simple.

### Tradeoffs

- Largest architecture change (API payload + parser logic).
- Backend currently only parses frontmatter/body with `gray-matter`; heading AST extraction is new backend capability.

## Recommendation

Use Option 1 first:

1. Add `rehype-slug`.
2. Render a dedicated right-side TOC component from heading data (H2/H3).
3. Add `scroll-margin-top` on rendered headings.
4. Optionally add `IntersectionObserver` active-section highlight afterward.

This is the best balance of control, UX quality, and low migration risk with the current `react-markdown` setup.

## Sources

- React Markdown (`remarkPlugins`, `rehypePlugins`, `components` support): https://github.com/remarkjs/react-markdown
- Rehype Slug (adds `id` attributes to headings): https://github.com/rehypejs/rehype-slug
- Rehype Autolink Headings (adds links to existing heading IDs): https://github.com/rehypejs/rehype-autolink-headings
- Remark TOC (inject TOC list in markdown AST): https://github.com/remarkjs/remark-toc
- `@jsdevtools/rehype-toc` package listing: https://www.npmjs.com/package/@jsdevtools/rehype-toc
- MDN `scroll-margin-top`: https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-top
- MDN Intersection Observer API: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
