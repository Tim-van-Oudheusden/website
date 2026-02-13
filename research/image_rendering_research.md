# Obsidian Image Rendering Research (Current Stack)

Research date: **2026-02-07**

## 1. Scope

This research answers two objectives:

1. Understand how Obsidian handles markdown + local images in a vault.
2. Determine implementation options for this repository (Fastify back-end + React `react-markdown` front-end), ending with a recommendation.

---

## 2. Objective 1: Obsidian Behavior Relevant to Images

## 2.1 Link and Embed Formats

Obsidian supports both:

- Wikilinks: `[[Note]]`, `[[Note|Alias]]`
- Markdown links: `[Alias](Note.md)`

For embeds, Obsidian uses `!` in front of an internal link:

- `![[Image.png]]`
- `![[Image.png|100x145]]` (size syntax)

Obsidian also supports standard markdown image links for remote/local URLs:

- `![Alt](path/to/image.png)`

Key interoperability point:

- Obsidian settings allow disabling wikilinks so generated links/images use standard markdown format instead.

## 2.2 Attachment Storage

Attachments are ordinary files in the vault. Obsidian can place them:

- at vault root,
- in a configured folder,
- in same folder as the note,
- or in a subfolder under current folder.

For this project, `/content/images` is a natural match with Obsidian’s “specified folder” attachment setting.

## 2.3 Frontmatter / Properties

Obsidian properties are stored as YAML (or JSON converted to YAML) frontmatter at the top of `.md` files, which is compatible with your current `gray-matter` parsing approach.

---

## 3. Objective 2: Fit With Current Stack

## 3.1 What the Repository Does Today

- Back-end reads markdown files from `/content`, parses frontmatter with `gray-matter`, and returns raw markdown body unchanged (`back-end/src/content.ts`).
- Front-end renders markdown via `react-markdown` + `remark-gfm` (`front-end/src/components/MarkdownRenderer.tsx`).
- No current static file endpoint exists for serving `/content/images/*` files from the back-end.

## 3.2 Observed Runtime Behavior (Current Renderer)

I verified how your current renderer treats Obsidian syntax with a local command using the same libraries.

Result:

- `![[content/images/test.png]]` renders as plain text (not an image).
- `![alt](content/images/test.png)` renders as `<img src="content/images/test.png">`.

So the current stack already supports **standard markdown image syntax**, but **not Obsidian wikilink image embeds**.

---

## 4. Implementation Options

## Option A (Lowest Complexity): Standard Markdown-Only Authoring in Obsidian

### How

1. In Obsidian:
   - Set attachment location to `/content/images` (folder specified).
   - Disable “Use Wikilinks”.
   - Set “New link format” to relative path (recommended) or absolute vault path.
2. In app:
   - Serve files from `/content/images` through back-end static route (for example `/content-assets/images/*`).
   - Ensure image `src` paths in markdown resolve to that served URL.

### Pros

- Minimal parser complexity.
- Uses existing markdown tooling as-is.
- Most interoperable markdown output.

### Cons

- Requires Obsidian vault settings discipline.
- Existing/legacy `![[...]]` embeds won’t render unless migrated.

---

## Option B: Keep Obsidian Wikilinks, Add a Compatibility Transform

### How

1. Keep Obsidian default wikilink behavior (`![[...]]`).
2. Add a transform stage (back-end before response, or front-end before render) that converts:
   - `![[image.png]]` -> markdown image URL pointing to served static path
   - `![[image.png|100x145]]` -> markdown image plus width/height metadata handling
   - `[[note|alias]]` -> app routes (for example `/articles/:slug`) when desired
3. Still add static image serving for `/content/images`.

### Pros

- Matches native Obsidian authoring UX.
- No need to retrain authors away from wikilinks.

### Cons

- More edge cases: aliases, headings (`#`), blocks (`#^`), size syntax, spaces/encoding.
- More test surface and long-term maintenance.

---

## Option C: Plugin-Based Wikilink Support in Markdown Pipeline

Candidate package: `@flowershow/remark-wiki-link` (explicitly targets Obsidian-style links and embeds).

### How

1. Add plugin to `react-markdown` `remarkPlugins`.
2. Configure generated URLs to your image and note routes.
3. Keep static serving for images.

### Pros

- Faster initial implementation than custom parser.
- Reuses remark ecosystem.

### Cons

- Smaller ecosystem/usage than core remark plugins.
- README indicates docs are still incomplete; dependency risk should be evaluated before adopting.

---

## 5. Static Image Serving Design (Applies to All Options)

Your app needs a URL path that serves files from `/content/images`.

Practical implementation choices:

1. Use `@fastify/static` with a safe `root` and `prefix`.
2. Build a custom Fastify route for image files with strict path validation.

Recommendation for speed and correctness: use `@fastify/static` unless you need custom authorization logic per file.

Security/robustness notes:

- Restrict to an explicit root (`/content/images` or `/content` with constrained prefix).
- Keep path traversal blocked.
- Consider allowing only known image extensions.
- Set cache headers for immutable image files where appropriate.

---

## 6. Recommendation

Recommended path: **Option A + a small compatibility fallback**

1. Standardize new content on markdown links/images from Obsidian (disable wikilinks, set attachment folder to `/content/images`, relative paths).
2. Add static image serving from back-end.
3. Add a lightweight compatibility transform only for `![[...]]` image embeds during migration, then keep or remove based on real usage.

Why this is the best fit for the current codebase:

- Current renderer already supports markdown images.
- Current back-end already parses frontmatter correctly for Obsidian-authored files.
- Most complexity today is not markdown rendering itself, but exposing local files safely over HTTP.
- This strategy gives immediate value with low risk, while still accommodating existing Obsidian-style notes.

---

## 7. Suggested Acceptance Criteria for Implementation

1. Markdown file with `![alt](images/example.png)` displays image in article view.
2. Markdown file with Obsidian-style `![[images/example.png]]` displays image (if compatibility mode enabled).
3. Broken image links return clean 404s without crashing article rendering.
4. Renaming/moving images in Obsidian remains predictable based on selected link format setting.
5. End-to-end test confirms image renders in `ArticlePage` when content API returns markdown body referencing local image.

---

## Sources

### Obsidian documentation

- Internal links: https://help.obsidian.md/Linking%20notes%20and%20files/Internal%20links
- Embed files: https://help.obsidian.md/embeds
- Attachments: https://help.obsidian.md/attachments
- Settings (Files & links): https://help.obsidian.md/settings
- Properties/frontmatter format: https://help.obsidian.md/properties
- Glossary (frontmatter): https://help.obsidian.md/glossary

### Stack/library documentation

- `react-markdown` README/API: https://github.com/remarkjs/react-markdown
- `@fastify/static` README: https://www.npmjs.com/package/@fastify/static
- `@fastify/static` repository: https://github.com/fastify/fastify-static
- `@flowershow/remark-wiki-link`: https://www.npmjs.com/package/@flowershow/remark-wiki-link

### Repository code references

- `back-end/src/content.ts`
- `front-end/src/components/MarkdownRenderer.tsx`
- `back-end/src/index.ts`

