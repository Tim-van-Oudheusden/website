---
title: Hello World
description: A sample article demonstrating all supported markdown features and frontmatter fields.
date: 2026-02-07T12:00:00Z
tags:
  - example
  - markdown
  - getting-started
type: article
draft: false
slug: hello-world
---

# Hello World

Welcome to the first article on this site. This sample file serves as both a **reference** for the expected Obsidian markdown format and a *smoke test* for the renderer.

## Text Formatting

You can write **bold**, *italic*, ~~strikethrough~~, and `inline code`. You can also combine **_bold and italic_** together.

## Links

- [Internal link](/articles)
- [External link](https://example.com)

## Lists

### Unordered

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered

1. Step one
2. Step two
3. Step three

### Task List

- [x] Define frontmatter schema
- [x] Install markdown dependencies
- [ ] Build content service
- [ ] Create article pages

## Blockquote

> The best way to predict the future is to invent it.
>
> — Alan Kay

## Code

Inline: use `console.log("hello")` to debug.

Fenced block with language tag:

```typescript
interface Article {
  title: string;
  content: string;
}

function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

## Table

| Feature         | Status | Notes              |
| --------------- | ------ | ------------------ |
| Frontmatter     | Done   | YAML parsing       |
| GFM tables      | Done   | remark-gfm plugin  |
| Syntax highlight | WIP   | rehype-pretty-code |
| Image support   | Done   | Lazy loading        |

## Image

![Placeholder image](https://via.placeholder.com/600x300?text=Sample+Image)

## Horizontal Rule

---

## Summary

This file covers headings, paragraphs, bold, italic, strikethrough, links, ordered lists, unordered lists, task lists, blockquotes, fenced code blocks with language tags, GFM tables, images, and horizontal rules.
