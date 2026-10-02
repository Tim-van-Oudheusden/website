# website
Personal website repository

## Back-end Host Binding

The Fastify server defaults to `HOST=127.0.0.1` for least-privilege local runs.

- Local development on the host machine: no override needed.
- Containers (`podman kube play` / `podman run`): set `HOST=0.0.0.0` explicitly so
  published ports and peer containers can reach the API.

## Local Development

The dev stack runs as a two-container Podman pod via `podman kube play` (no
docker-compose). Build the dev images and deploy in one step:

```bash
scripts/dev.sh        # build dev images + deploy + follow pod logs
scripts/dev-down.sh   # tear the dev pod down
```

The pod publishes:

- Front-end (Vite dev server, HMR): <http://localhost:5173>
- Back-end (Fastify): <http://localhost:3001> — `/health` at the root

Host source is bind-mounted, so edits hot-reload without a rebuild.

Run the E2E suite the way CI does with `scripts/e2e.sh` (see
[`docs/testing.md`](docs/testing.md)).

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
