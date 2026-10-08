# Content authoring

How to write articles and projects for the site: Obsidian settings, image syntax, the frontmatter
reference, the content check to run before pushing, and link previews.

## Obsidian Content Authoring

Markdown content lives in `content/` and should be authored in Obsidian using these settings.

1. `Settings -> Files and links -> Default location for new attachments`:
   `In the folder specified below`
2. `Settings -> Files and links -> Attachment folder path`:
   `content/images`
3. `Settings -> Files and links -> Use [[Wikilinks]]`:
   `Off` (preferred default for new content)
4. `Settings -> Files and links -> New link format`:
   `Relative path to file`

Canonical image syntax for guaranteed rendering in this app:

```md
![Tracking pixel](/content-assets/images/pixel.gif)
```

The image route is served by the back-end and maps to files stored in `content/images`.

### Frontmatter reference

Every `content/*.md` file starts with a YAML frontmatter block. The back-end
checks it against the rules below; the allowed values come from the shared
contract in `shared/src/index.ts` (`ARTICLE_CATEGORIES`, `PROJECT_STATUSES`,
`PROJECT_LINK_TYPES`).

**A document that breaks a rule is silently left out of the site.** No error is
shown: it disappears from every listing and its URL returns "not found". Run
the [content checker](#checking-content-before-pushing) before pushing.

#### Common fields (articles and projects)

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `title` | Yes | Non-empty string | Heading, card title, link-preview title. |
| `date` / `publishDate` | One of them | Date (`2026-02-08`) or non-empty string | Publication date for sorting and display. `date` wins when both are set. |
| `description` | No | String (default empty) | Summary on cards and in link previews. |
| `tags` | No | List of strings | Tag badges; non-string entries are dropped. |
| `type` | No | `article` or `project` | Content kind. Missing or any other value counts as `article`, so a typo such as `type: projet` makes a project fail the article rules. |
| `draft` | No | `true` or `false` (default `false`) | `true` hides the document when `NODE_ENV=production`; it still shows in local dev. Only a YAML boolean counts: `"true"` in quotes is ignored. |
| `slug` | No | Non-empty string | URL segment (`/articles/<slug>`, `/projects/<slug>`). Defaults to the file name without `.md`, spaces included. |
| `socialImage` | No | Image path | Link-preview image; see [Link previews](#link-previews-socialimage). |

#### Article fields (`type: article`)

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `category` | Yes | `Introduction`, `Linux`, `Work`, `Personal Life` (exact case) | Groups the article in the Articles sidebar. |
| `homeRecommended` | No | `true` or `false` (default `false`) | `true` adds the article to the pool for the home page's "For you" section, which shows three articles from the pool at random on each page load and fills any empty places with the newest other articles. Only a YAML boolean counts: `"true"` in quotes is ignored. |

#### Project fields (`type: project`)

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `coverImage` | Yes | Non-empty image path or URL | Cover image on the project card and page. |
| `coverImageAlt` | Yes | Non-empty string | Alt text for the cover image. |
| `status` | No | `Planned`, `In Progress`, `Shipped`, `Archived` (exact case) | Status badge on the card. **Any other value rejects the file.** |
| `prioritySlot` | No | `1`, `2` or `3` | Places the project in the top "Featured project" section, in slot order. **Any other value rejects the file.** |
| `featured` | No | `true` or `false` (default `false`) | Leads the top section when no project sets `prioritySlot`. |
| `projectOrder` | No | Number (default `0`) | Sort order: lower first, ties broken by newest date. |
| `role` | No | String | "Role" on the project page. |
| `created` | No | String or number (e.g. `2026`) | Timeframe on the card and the project page. |
| `links` | No | List of `{ type, label, href }`; `type` is one of `demo`, `repo`, `docs`, `article`, `external` | Link buttons on the project page. Entries with another `type` or a missing `label`/`href` are dropped without rejecting the file. |
| `info` | No | String | Highlight line on the card and "Info" on the project page. |

Minimal valid examples:

```yaml
---
title: Introduction
publishDate: 2026-02-08
type: article
category: Introduction
---
```

```yaml
---
title: Pi Sandbox Automation
date: 2026-06-10
type: project
coverImage: /images/projects/pi-sandbox-automation.svg
coverImageAlt: Small computer board with container blocks.
status: Shipped
links:
  - type: repo
    label: Repository scripts
    href: https://github.com/Tim-van-Oudheusden/website
---
```

### Checking content before pushing

Check every document in `content/` against the frontmatter rules:

```bash
bun run --filter back-end validate:content
```

All valid (exit code 0):

```text
Content validation passed.
```

Otherwise it lists each invalid file with the offending field, then exits 1:

```text
- My draft.md (category): Article must declare a valid "category"
Content validation failed: 1 invalid document(s).
```

It reports the first broken rule per file, so rerun it after each fix. A file
with a missing or unclosed frontmatter block is reported as a `(document)`
error. CI runs the same check on committed content via the back-end test suite.

### Link previews (`socialImage`)

Sharing an article URL (LinkedIn, Mastodon, Slack, …) shows a preview card built
from Open Graph tags that the production front-end server injects for
`/articles/<slug>`: `title` and `description` from frontmatter, plus the image
from `socialImage`:

```yaml
socialImage: images/cover.png   # relative → content/images/cover.png
socialImage: /images/me.png     # root-absolute → a site path (public/)
```

Use a PNG or JPEG of 1200×630 (LinkedIn ignores SVG). `content/images/cover.png`
is the generic placeholder. Without `socialImage` the preview has no image.
Crawlers cache previews; LinkedIn's Post Inspector re-fetches one on demand.
