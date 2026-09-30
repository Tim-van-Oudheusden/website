# website
Personal website repository

## Back-end Host Binding

The Fastify server defaults to `HOST=127.0.0.1` for least-privilege local runs.

- Local development on the host machine: no override needed.
- Containers (`podman kube play` / `podman run`): set `HOST=0.0.0.0` explicitly so
  published ports and peer containers can reach the API.

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
