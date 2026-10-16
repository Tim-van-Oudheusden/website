# Content authoring

How to write articles and projects for the site: Obsidian settings, image syntax, the frontmatter
reference, the content check to run before pushing, link previews, and the standalone pages
(`/now`, `/uses`).

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

### YouTube embeds

A YouTube video link alone in its paragraph (a bare URL or `[text](url)` on its own line)
renders as an embedded player from the privacy-enhanced `youtube-nocookie.com` host,
captioned with the link; the link text becomes the player's accessible title:

```md
[Build With Tim - introduction video](https://www.youtube.com/watch?v=_muNlsJ9VM8)
```

`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/` and `/live/` links work, and a `t=`/`start=`
start time carries over. A YouTube link inside a sentence stays a plain link.

### Frontmatter reference

Every `content/*.md` file starts with a YAML frontmatter block. The back-end
checks it against the rules below; the allowed values come from the shared
contract in `shared/src/index.ts` (`ARTICLE_CATEGORIES`, `PROJECT_STATUSES`,
`PROJECT_LINK_TYPES`). Pages in `content/pages/` follow their own, shorter
rules: see [Standalone pages](#standalone-pages-contentpages).

The parser reads a subset of YAML: `key: value` lines, block lists
(`- item` on its own line), and the `links` list of objects. Within that subset:

- Quote a value that contains `: ` or starts with `#`, e.g.
  `title: "Flatpak: a field guide"`. Double or single quotes both work; the
  quotes are removed, and a quoted value is always a string. Inside double
  quotes write `\"` for a quote and `\\` for a backslash; inside single quotes
  write `''` for a quote.
- A ` # comment` after an unquoted value is ignored: `draft: true # not ready`
  is the boolean `true`.
- A whole line that starts with `#` is a comment at any indent, including
  inside a `tags` or `links` list or between a link's fields; it does not end
  the list, so `# - Windows` between two tags just leaves that tag out.
- A key needs a space after its colon (`draft: true`). Without one the line is
  plain text: `- Re:Zero` and `- https://example.com` are string list items,
  and a `draft:true` line is not a field.
- An unquoted whole number or `true`/`false` is read as a number or boolean,
  not as text. In a text field (`title`, `description`, `slug`, `socialImage`,
  and on projects `coverImage`, `coverImageAlt`, `role`, `info`) or as a `tags`
  entry it makes the document invalid; quote it instead: `slug: "2025"`,
  `- "2025"`.
- Flow lists and multi-line values are not supported; write lists one
  `- item` per line. A flow list such as `tags: [a, b]` is read as one string,
  which breaks the `tags` rule below. The `- item` lines may be indented under
  their key or sit at the key's own indent; both read the same.

**A document that breaks a rule is silently left out of the site.** No error is
shown: it disappears from every listing and its URL returns "not found". Run
the [content checker](#checking-content-before-pushing) before pushing.

#### Common fields (articles and projects)

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `title` | Yes | Non-empty string | Heading, card title, link-preview title. |
| `date` / `publishDate` | One of them | Date as `YYYY-MM-DD` (`2026-02-08`), a day that exists on the calendar | Publication date for sorting and display. `date` wins when both are set. Any other value, such as `2026-02-30`, `2026-10-2`, `13-10-2026` or a time like `2026-06-10T00:30:00+02:00`, makes the document invalid, and the [content checker](#checking-content-before-pushing) reports `date must be a YYYY-MM-DD calendar day`. A valid `publishDate` does not make up for a malformed `date`. |
| `description` | No | String (default empty) | Summary on cards and in link previews. |
| `tags` | No | List of strings, one `- item` per line | Tag badges. An unquoted number or `true`/`false` entry (`- 2025`) makes the document invalid; quote it (`- "2025"`). A value that is not a list, including a flow list (`tags: [a, b]`) or a single `tags: a`, also makes the document invalid. An article's badges link to `/tags/<tag>`: the tag in lowercase, with every run of characters other than letters, digits, `+` and `#` turned into one hyphen (`Content API` → `/tags/content-api`, `C++` → `/tags/c++`). Spellings that differ only in letter case, spaces, hyphens or underscores share a page. The [content checker](#checking-content-before-pushing) fails on an article tag with no letter, digit, `+` or `#` (such as an emoji), and on two other spellings that would share a page (`.NET` and `NET`), drafts included. |
| `type` | No | `article` or `project` | Content kind. Missing or any other value counts as `article`, so a typo such as `type: projet` makes a project fail the article rules. |
| `draft` | No | `true` or `false` (default `false`) | `true` hides the document when `NODE_ENV=production`; it still shows in local dev. Only a YAML boolean counts: `"true"` in quotes is ignored. |
| `slug` | No | Non-empty string without `/`, `?`, `#`, `%` or `\` | URL segment (`/articles/<slug>`, `/projects/<slug>`). Defaults to the file name without `.md`, spaces included, so a file name with one of those characters needs an explicit `slug`. Must be unique among published (non-draft) articles and projects. A draft may share a published document's slug while a rewrite is in progress: production serves the published one, while local dev lists both and opens whichever file is read first. The [content checker](#checking-content-before-pushing) fails on a forbidden character (drafts included) or on a published document whose slug another published file already uses: the site would still list that file, but its page would not open. |
| `socialImage` | No | Image path | Link-preview image; see [Link previews](#link-previews-socialimage). |

#### Article fields (`type: article`)

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `category` | Yes | `Introduction`, `Linux`, `Work`, `Personal Life` (exact case) | Groups the article in the Articles sidebar. The end of each article links to the three newest other articles in its category ("More from `<category>`"). |
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
title: Dailies
date: 2026-10-16
type: project
coverImage: /images/projects/dailies.webp
coverImageAlt: The Dailies icon above the name Dailies and its tagline.
status: In Progress
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/Dailies
---
```

### Checking content before pushing

Check every article and project in `content/` against the frontmatter rules.
It does not look inside subfolders, so pages in `content/pages/` are not
checked:

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

Sharing an article or project URL (LinkedIn, Mastodon, Slack, …) shows a
preview card built from Open Graph tags that the production front-end server
injects for `/articles/<slug>` and `/projects/<slug>`: `title` and `description`
from frontmatter, a canonical URL, plus the image from `socialImage`:

```yaml
socialImage: images/cover.png   # relative → content/images/cover.png
socialImage: /images/me.png     # root-absolute → a site path (public/)
```

Use a PNG or JPEG of 1200×630 (LinkedIn ignores SVG). `content/images/cover.png`
is the generic placeholder. A project without `socialImage` uses its
`coverImage`, unless that is an SVG. Otherwise the preview falls back to the
site portrait (`/images/me.png`, as on the homepage) on a small card. Crawlers
cache previews; LinkedIn's Post Inspector re-fetches one on demand.

The same server adds schema.org structured data (JSON-LD) to each page, so
search engines can show a rich result: a `BlogPosting` for an article (headline
from `title`) and a `CreativeWork` for a project (name from `title`). Both carry
`description`, the date from `date`, Tim as author, and the preview image when
there is one. The homepage carries a `WebSite` and a `Person` for Tim, whose
`sameAs` lists his profiles from `shared/src/social-links.ts`.

### Standalone pages (`content/pages/`)

`/now` and `/uses` are single Markdown pages read from `content/pages/now.md`
and `content/pages/uses.md`. They never appear in the article or project
listings, and they use their own frontmatter instead of the rules above:

| Field | Required | Allowed values | Effect |
| --- | --- | --- | --- |
| `title` | Yes | Non-empty string | Page heading. |
| `updated` | Yes | Date as `YYYY-MM-DD` (`2026-10-08`), a day that exists on the calendar | Shown under the heading as "Last updated October 8, 2026". Any other value, such as `October 8` or `2026-02-30`, counts as missing. |
| `description` | No | String (default empty) | Line under the heading. |

Any other field, such as `type`, `category` or `draft`, is ignored. There is
no draft state: a page is live as soon as its file is deployed.

```yaml
---
title: Now
description: What I am focused on at the moment.
updated: 2026-10-08
---
```

**A page missing `title` or `updated`, or with an `updated` that is not a
`YYYY-MM-DD` day, shows "Page not found", with no error.**
The [content checker](#checking-content-before-pushing) does not check this
folder, so open the page in the dev server after editing it. Images work as in
articles.

A new file in `content/pages/` is not a new page on its own. The pages that
exist are listed in `STANDALONE_PAGE_SLUGS` in `shared/src/index.ts`. The
front-end registers a `/<slug>` route and a sitemap entry for each slug in that
list, so adding a page means adding its slug there, which is a code change. The
file name, which is the slug, must be lowercase letters, digits and single
hyphens (`my-page.md`); any other name is never served.
