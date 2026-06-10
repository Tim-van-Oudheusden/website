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
coverImage: /images/projects/obsidian-content-pipeline.svg
coverImageAlt: Abstract Adwaita editorial artwork showing markdown documents flowing into organized content cards.
featured: false
projectOrder: 20
status: Shipped
role: Developer and content author
timeframe: 2026
links:
  - type: article
    label: Notes article
    href: /articles/making-my-work-easier-with-notes-in-obsidian
outcome: Made markdown authoring predictable enough to support articles and project case studies from one content folder.
---

# Obsidian Content Pipeline

This project connects my note-taking workflow to the website. Markdown files live in `content/`, use frontmatter for structured metadata, and can reference images served through the back-end content asset route.

## Problem

Writing in a separate CMS would create friction. I wanted the website to accept content from the same markdown workflow I already use for thinking and drafting.

## Approach

The pipeline normalizes frontmatter, filters drafts in production, rewrites Obsidian image embeds, and renders markdown with consistent typography on the front end.

## Outcome

The website can publish article and project content without duplicating authoring workflows or introducing a separate content system.
