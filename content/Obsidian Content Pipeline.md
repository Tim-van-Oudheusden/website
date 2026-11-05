---
title: Obsidian Content Pipeline
description: A markdown workflow that turns Obsidian-authored notes into website content with frontmatter and image handling.
date: 2026-06-10
tags:
  - Obsidian
  - Markdown
  - Content API
  - Automation
type: project
draft: false
slug: obsidian-content-pipeline
coverImage: /images/projects/obsidian-content-pipeline.webp
coverImageAlt: The Obsidian Content Pipeline icon, a markdown note with a hash sign behind a published page card and a yellow arrow, above the name Obsidian Content Pipeline, the tagline "Write in Obsidian, publish on the web" and a link to the website repository on a deep purple background.
socialImage: images/obsidian-content-pipeline/social-preview.png
featured: false
projectOrder: 20
status: Shipped
role: Developer and content author
created: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/website
  - type: article
    label: Notes article
    href: /articles/making-my-work-easier-with-notes-in-obsidian
info: Made markdown authoring predictable enough to support articles and project case studies from one content folder.
---

# Obsidian Content Pipeline

![The Obsidian Content Pipeline icon: a markdown note with a hash sign behind a published page card, with a yellow arrow pointing from the note to the page](/content-assets/images/obsidian-content-pipeline/icon.svg)

This project connects my note-taking workflow to the website. Every article and project page on this site, this one included, starts as a markdown note in Obsidian. The notes live in the `content/` folder of the website repository, use frontmatter for structured metadata, and reference images that the back-end serves next to them.

## Problem

I already do my thinking and drafting in [Obsidian](https://obsidian.md/), as I wrote in [Making my work easier with notes in Obsidian](/articles/making-my-work-easier-with-notes-in-obsidian). A separate CMS would mean copying every finished note into a web form, keeping two versions in sync and learning a second editor. That kind of friction is exactly what makes me stop writing.

So I wanted the website to accept content from the same markdown workflow I already use, without turning my notes into something I can no longer open in Obsidian.

## Approach

The pipeline normalizes frontmatter, filters drafts in production, rewrites Obsidian image embeds, and renders markdown with consistent typography on the front end. The sections below go through each of those steps.

## One folder, two kinds of pages

The content folder is an ordinary Obsidian vault folder. A note becomes an **article** or a **project** depending on the `type` in its frontmatter, and the same file can be opened, edited and previewed in Obsidian before it ever reaches the site.

- **Articles** need a `category` and get a table of contents built from their headings, tag pages and a "More from" list of related articles.
- **Projects** need a cover image and its alt text, and can add a status, role, timeframe, highlight line and links, like the ones at the top of this page.

Obsidian is set up to save attachments in `content/images` and to write relative markdown links, so whatever I paste into a note ends up in the place the website expects it.

## Frontmatter that is checked, not guessed

The frontmatter is read by a small parser of my own instead of a general YAML library. It understands the subset my notes actually use: `key: value` lines, plain lists such as `tags` and one level of objects for `links`. Dropping the general-purpose library also removed a dependency with known denial-of-service advisories.

Every document is then checked against the content rules: a valid date, a known article category, a known project status, a slug that is unique and safe to put in a URL, and text fields that are really text. Small things YAML would happily accept, like an unquoted `slug: 2025` turning into a number, are reported instead of silently changing the page.

A document that breaks a rule is left out of the site rather than breaking it. To make sure that never happens by accident, I run a content checker before pushing:

```bash
bun run --filter back-end validate:content
```

It lists each invalid file with the field that is wrong, and the same check runs in CI on every change.

## Drafts stay drafts

Setting `draft: true` keeps a note visible while I work on it locally, but hides it in production. Because a forgotten draft is easy to merge, the release job refuses to publish the site while any file in `content/` is still marked as a draft. A half-finished note can live on its branch for as long as it needs to, but it never goes live by accident.

## Obsidian syntax on the web

Notes should look the same in Obsidian and on the site, so the pipeline translates the Obsidian-specific parts of my markdown:

- **Image embeds** such as `![[images/diagram.png|A diagram]]` are rewritten to regular markdown images served from the back-end's content asset route, with the text after `|` as alt text. Embeds inside code blocks are left alone, so I can still write about the syntax itself.
- **Callouts** like `> [!tip] Before you start` render as callout boxes.
- **Code blocks** that name a language are syntax-highlighted.
- **YouTube links** on a line of their own turn into an embedded player from YouTube's privacy-enhanced domain.

On the front end, the markdown is rendered with GitHub Flavored Markdown, so tables, task lists and strikethrough work as they do in Obsidian. Raw HTML is deliberately not rendered.

## Images served next to the content

Images in `content/images` are served by the back-end with a cache header and an ETag, so an image I edit in place shows up after a short while without renaming it. Paths are checked so a request can never leave the images folder, and SVG files are served with a strict content security policy so no script inside one can run.

## Sharing a page

When an article or project is shared on LinkedIn, Mastodon or Slack, the production server adds Open Graph tags built from the same frontmatter: the title, the description and the `socialImage`. It also adds structured data for search engines. The preview card for this page is one of those social images.

## Outcome

The website publishes articles and project case studies from one content folder, without duplicating my authoring workflow or introducing a separate content system. Writing for the site feels the same as writing any other note: I draft in Obsidian, check the frontmatter, push, and the page is live once the pull request is merged.

The full set of rules, from frontmatter fields to image syntax, is in the content authoring guide in the [website repository](https://github.com/Tim-van-Oudheusden/website).
