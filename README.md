# website
Personal website repository

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
