# Projects Page Design

## Context

The website already has basic project routes at `/projects` and `/projects/:slug`. The current implementation lists project frontmatter in a simple card grid and renders detail pages with `MarkdownRenderer`. The shared content schema only supports generic fields today: `title`, `description`, `date`, `tags`, `draft`, `slug`, and `type`.

The visual system is Tailwind CSS v4 with shadCN CSS variables and an Adwaita/GNOME-inspired palette. Existing reusable UI primitives include `Card`, `Badge`, `Button`, `Collapsible`, `DropdownMenu`, and `Sheet`. The project page work should stay within those CSS and component options.

Research into common project and portfolio pages showed that credibility-focused pages work best when they act as curated case-study hubs: a short positioning statement, a featured strongest project, scannable project cards, and detail pages that explain context, decisions, and outcome.

## Product Goal

The Projects page should primarily prove credibility. It should show selected work as evidence of skill, taste, and practical outcomes rather than behave like a full archive or a heavily filtered catalog.

The first version should support mixed project cards: some entries will become full internal case studies, while others may remain lighter project entries. Every card should default to an internal `/projects/:slug` destination, with external demo, repo, docs, or related links treated as secondary actions.

## Landing Page Design

Use an image-led `Editorial Featured + Gallery` layout.

The page structure is:

1. Hero intro with concise positioning copy that explains what the projects prove.
2. Featured project area with one strongest project shown as a large editorial card.
3. Supporting project gallery with smaller image-led cards for the remaining projects.
4. Empty, loading, and error states that match the existing site tone.

The first version should not include filters. Sorting and hierarchy should come from project metadata, especially featured state, project order, and date.

Cards should include:

- Custom cover artwork.
- Project title.
- Short description.
- Tags.
- Status, role, timeframe, or outcome when available.
- A clear internal case-study CTA.
- Secondary external links when provided.

## Artwork Direction

Project cards should use custom Adwaita editorial illustrations rather than screenshots.

Artwork should extend the existing site language: soft rounded shapes, GNOME/Adwaita-inspired colors, warm editorial compositions, and project-specific metaphors. It should not introduce a separate visual system or rely on screenshot assets.

Each project should provide accessible alt text for its cover artwork.

## Data Contract

Project frontmatter should expand to include project-specific metadata while preserving the existing article contract.

Project entries should support:

- `coverImage`
- `coverImageAlt`
- `featured`
- `projectOrder`
- `status`
- `role`
- `timeframe`
- `links`
- `outcome`
- Existing fields: `title`, `description`, `date`, `tags`, `slug`, `draft`, `type`

The backend should normalize these fields only for `type: project` content and return them through the existing content endpoints. Article normalization should keep its current behavior.

Starter project markdown entries should be created so the redesigned page can be reviewed with real content instead of empty placeholders.

## Project Detail Pages

Project detail pages should remain markdown-first.

The `/projects/:slug` page should keep using `MarkdownRenderer` for the body content, but the header should become project-specific:

- Back or breadcrumb link to Projects.
- Cover artwork near the top.
- Title and description.
- Date, status, role, timeframe, tags, and outcome where present.
- Secondary link buttons for demo, repo, docs, or related destinations.
- Error and not-found states consistent with the current project pages.

The detail route must guard against article slugs rendering as project pages. If fetched content is not `type: "project"`, the page should show the project not-found state.

## Testing And Verification

Implementation should follow the repo's TDD rules.

Expected test coverage includes:

- Shared type/schema tests for project metadata.
- Backend normalization tests for project-specific frontmatter.
- Projects landing-page render tests for featured layout, gallery cards, artwork alt text, links, and states.
- Project detail-page render tests for metadata header, markdown body, external links, and article-slug guard.
- Responsive and accessibility verification for mobile and desktop layouts.

Expected quality gates for implementation work:

- `bun test`
- `bun run typecheck`
- `bun run lint`
- Production build when relevant: `bun run build`

## Ticket Boundaries

The implementation should be divided into separate beads tickets:

- Expand project metadata contract and backend normalization.
- Add starter project content and custom artwork assets.
- Redesign the Projects landing page.
- Polish the Project detail page.
- Run final responsive, accessibility, and quality-gate verification.

## Open Constraints

No new dependencies should be added for the first version. If additional shadCN components are proposed later, they require explicit approval before installation or generation.

The design should use the project's existing Tailwind CSS utilities, CSS custom properties, and available shadCN primitives.
