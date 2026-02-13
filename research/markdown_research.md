# Markdown to HTML Rendering - Research (website-c5o)

> Research conducted February 2026 for: React 19 + TypeScript + Vite 7 + Bun + Tailwind CSS v4 + shadcn/ui (new-york) + Fastify back-end monorepo.

---

## Table of Contents

1. [Client-Side Rendering](#1-client-side-rendering)
2. [Build-Time / Static Rendering](#2-build-time--static-rendering)
3. [Server-Side Rendering (Fastify)](#3-server-side-rendering-fastify)
4. [Hybrid Approaches](#4-hybrid-approaches)
5. [Styling with Tailwind CSS](#5-styling-with-tailwind-css)
6. [Syntax Highlighting](#6-syntax-highlighting)
7. [Recommendation](#7-recommendation)

---

## 1. Client-Side Rendering

### 1.1 react-markdown

| Attribute | Details |
|---|---|
| **Package** | [`react-markdown`](https://www.npmjs.com/package/react-markdown) |
| **Weekly downloads** | ~8.1 million |
| **GitHub stars** | ~15,300 |
| **Bundle size** | ~42.6 kB min+gz (base); ~60 kB with rehype-raw |
| **React 19** | Issue [#920](https://github.com/remarkjs/react-markdown/issues/920) tracks React 19 compatibility; type errors reported with v8.0.7 and React 19 (`JSX.IntrinsicElements`). Check latest versions for fixes. |
| **Maintenance** | Active (part of the unified/remark ecosystem) |

**How it works:** A React component that takes a markdown string and renders it to React elements via the remark/rehype pipeline. Does **not** use `dangerouslySetInnerHTML` -- it builds a virtual DOM so React only updates what changed.

**Pros:**
- De facto standard for markdown-in-React
- Secure by default (sanitizes output, prevents XSS)
- Rich plugin ecosystem (remark-gfm for GitHub Flavored Markdown, rehype-raw for raw HTML, etc.)
- Custom component overrides (swap `<h1>`, `<a>`, `<code>`, etc. with your own React components)
- Works with the full unified/remark/rehype plugin pipeline

**Cons:**
- Larger bundle than minimal alternatives
- React 19 type compatibility issue may need workaround (monitor GitHub issue)
- Runtime parsing on every render (can be mitigated with memoization)

**Example:**
```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function Article({ content }: { content: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]}>
      {content}
    </Markdown>
  );
}
```

---

### 1.2 markdown-to-jsx

| Attribute | Details |
|---|---|
| **Package** | [`markdown-to-jsx`](https://www.npmjs.com/package/markdown-to-jsx) |
| **Bundle size** | ~5 kB min+gz (with Vite browser optimization via conditional exports) |
| **Maintenance** | Active |

**How it works:** Lightweight alternative that parses markdown and outputs JSX directly. Uses a modified fork of simple-markdown as the parsing engine.

**Pros:**
- Very small bundle (~5 kB vs ~42 kB for react-markdown)
- Supports arbitrary HTML parsed into JSX (no `dangerouslySetInnerHTML`)
- Component overrides supported
- Automatic browser bundle optimization for Vite (conditional exports reduce size by ~11 kB)

**Cons:**
- Smaller plugin ecosystem than react-markdown
- No built-in remark/rehype plugin support
- Less battle-tested with complex markdown features

---

### 1.3 marked

| Attribute | Details |
|---|---|
| **Package** | [`marked`](https://www.npmjs.com/package/marked) |
| **Latest version** | 17.0.1 |
| **Weekly downloads** | ~15.7 million |
| **GitHub stars** | ~36,400 |
| **Maintenance** | Active (4 maintainers) |

**How it works:** A fast markdown-to-HTML-string parser. Not React-specific -- outputs raw HTML strings.

**Pros:**
- Extremely fast parsing
- Huge adoption and ecosystem
- Simple API (`marked.parse(markdownString)`)
- Good for server-side use (Node.js / Fastify)

**Cons:**
- Outputs HTML strings, requiring `dangerouslySetInnerHTML` in React (XSS risk)
- Does not sanitize input by default
- No native React component mapping
- Not ideal for client-side React rendering

---

### 1.4 markdown-it

| Attribute | Details |
|---|---|
| **Package** | [`markdown-it`](https://www.npmjs.com/package/markdown-it) |
| **Weekly downloads** | ~13.1 million |
| **GitHub stars** | ~20,900 |
| **Maintenance** | Active |

**How it works:** Pluggable markdown parser with full CommonMark support. Like marked, outputs HTML strings.

**Pros:**
- Full CommonMark specification compliance
- Rich plugin architecture for extending syntax
- Secure by default
- Excellent for server-side rendering

**Cons:**
- Like marked, produces HTML strings (requires `dangerouslySetInnerHTML` in React)
- Heavier than marked
- No native React component integration

---

### 1.5 The Unified / Remark / Rehype Ecosystem

This is the **foundation** that react-markdown is built on. You can use it directly for maximum control.

| Package | Role |
|---|---|
| [`unified`](https://www.npmjs.com/package/unified) | Core processor |
| [`remark-parse`](https://www.npmjs.com/package/remark-parse) | Markdown to mdast (markdown AST) |
| [`remark-rehype`](https://www.npmjs.com/package/remark-rehype) | mdast to hast (HTML AST) |
| [`rehype-react`](https://www.npmjs.com/package/rehype-react) | hast to React elements |
| [`rehype-stringify`](https://www.npmjs.com/package/rehype-stringify) | hast to HTML string |
| [`remark-gfm`](https://www.npmjs.com/package/remark-gfm) | GitHub Flavored Markdown support |

**When to use directly:** When you need a highly customized pipeline beyond what react-markdown's wrapper provides.

---

## 2. Build-Time / Static Rendering

### 2.1 MDX

| Attribute | Details |
|---|---|
| **Package** | [`@mdx-js/mdx`](https://www.npmjs.com/package/@mdx-js/mdx) |
| **Vite plugin** | [`@mdx-js/rollup`](https://www.npmjs.com/package/@mdx-js/rollup) (works with Vite) |
| **React binding** | [`@mdx-js/react`](https://www.npmjs.com/package/@mdx-js/react) (optional context provider) |
| **Maintenance** | Active |

**How it works:** MDX lets you write JSX directly inside markdown files. At build time, `.mdx` files are compiled to React components. Integrates with Vite via `@mdx-js/rollup`.

**Pros:**
- Embed interactive React components directly in markdown
- Build-time compilation (no runtime parsing overhead)
- Full remark/rehype plugin support
- Confirmed working with React 19 + Vite 7 in real projects (2025)
- HMR and SSR support via Vite

**Cons:**
- Content must be `.mdx` files at build time (not dynamic strings from API/database)
- Adds build complexity
- Authors must understand JSX syntax
- Not suitable for user-generated content

**Vite configuration:**
```ts
// vite.config.ts
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";

export default {
  plugins: [
    mdx({ remarkPlugins: [], rehypePlugins: [] }),
    react(),
  ],
};
```

**Best for:** Blog posts, documentation, or static content where markdown files live in the repository and you want to embed React components.

---

### 2.2 Velite

| Attribute | Details |
|---|---|
| **Package** | [`velite`](https://www.npmjs.com/package/velite) |
| **Purpose** | Type-safe content layer (Contentlayer replacement) |
| **Maintenance** | Active |

**How it works:** Transforms content files (Markdown, MDX, YAML, JSON) into a type-safe data layer using Zod schemas. Generates TypeScript types automatically.

**Pros:**
- Modern replacement for the abandoned Contentlayer
- Zod-based schema validation
- Lightweight, fast startup
- Supports markdown and MDX

**Cons:**
- Primarily designed for Next.js / static site use cases
- May need adaptation for a Vite + Fastify monorepo
- Smaller community than alternatives

---

### 2.3 Content Collections

| Attribute | Details |
|---|---|
| **Package** | [`@content-collections/core`](https://www.npmjs.com/package/@content-collections/core) |
| **Purpose** | Contentlayer-inspired content framework |
| **Maintenance** | Active |

**How it works:** Another Contentlayer successor that provides schema-defined content transformations with TypeScript support.

**Pros:**
- Compatible with Next.js App Router
- Flexible schema definitions
- Growing ecosystem (Fumadocs integration)

**Cons:**
- Primarily aimed at Next.js projects
- Less relevant for a Vite + Fastify stack

---

## 3. Server-Side Rendering (Fastify)

### 3.1 Using marked / markdown-it on Fastify

Convert markdown to HTML on the server and send pre-rendered HTML to the client.

```ts
// Fastify route example
import Fastify from "fastify";
import { marked } from "marked";

const app = Fastify();

app.get("/api/content/:slug", async (request, reply) => {
  const markdown = await loadMarkdownFromDB(request.params.slug);
  const html = await marked.parse(markdown);
  return { html };
});
```

**Pros:**
- Zero client-side bundle cost for markdown parsing
- Better SEO (pre-rendered HTML)
- Consistent rendering across all clients
- marked and markdown-it both run natively in Node.js / Bun

**Cons:**
- Additional server CPU load
- HTML string must be injected via `dangerouslySetInnerHTML` on the client
- Harder to use React component overrides for rendered elements
- No interactive React components within markdown

### 3.2 Using unified/remark on Fastify

```ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

async function markdownToHtml(markdown: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}
```

**Pros:**
- Same pipeline as react-markdown (consistency)
- Full plugin ecosystem available
- Can add syntax highlighting at build/serve time (via rehype-shiki)

**Cons:**
- Same `dangerouslySetInnerHTML` issue on the client
- Slightly more complex setup than marked

### 3.3 fastify-markdown plugin

| Attribute | Details |
|---|---|
| **Package** | [`fastify-markdown`](https://github.com/freezestudio/fastify-markdown) |
| **Maintenance** | Low activity |

A community plugin that adds `reply.markdown()` to Fastify. Functional but lightly maintained -- using marked or unified directly is more reliable.

---

## 4. Hybrid Approaches

### 4.1 Server Parse + Client Render with React Components

1. **Server (Fastify):** Parse markdown to an intermediate AST (using remark-parse) or to HTML
2. **Client (React):** Receive the AST/HTML and render with React component overrides

This gives you server-side processing benefits while maintaining React component flexibility on the client.

### 4.2 Cache-Based Approach

1. **On content change:** Convert markdown to HTML server-side (via Fastify route or background job)
2. **Store** rendered HTML alongside raw markdown in the database
3. **Serve** pre-rendered HTML for display; use raw markdown for editing
4. **Client** renders HTML with Tailwind `prose` classes

### 4.3 MDX for Static + react-markdown for Dynamic

- Use **MDX** for static content that lives in the repo (docs, about pages)
- Use **react-markdown** for dynamic content from the database (user posts, API content)
- Both use the same remark/rehype plugin pipeline, ensuring consistent rendering

---

## 5. Styling with Tailwind CSS

### 5.1 @tailwindcss/typography

| Attribute | Details |
|---|---|
| **Package** | [`@tailwindcss/typography`](https://www.npmjs.com/package/@tailwindcss/typography) |
| **Status** | Official first-party Tailwind plugin, actively maintained |
| **Tailwind v4** | Fully compatible |

**Installation:**
```bash
bun add -d @tailwindcss/typography
```

**Tailwind CSS v4 configuration** (in your main CSS file):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

**Usage:**
```tsx
<article className="prose dark:prose-invert lg:prose-lg">
  <Markdown>{content}</Markdown>
</article>
```

**Key features:**
- `prose` class applies beautiful typographic defaults to all child HTML elements
- Element modifiers: `prose-headings:underline`, `prose-a:text-blue-600`, `prose-img:rounded-xl`
- Size variants: `prose-sm`, `prose-base`, `prose-lg`, `prose-xl`, `prose-2xl`
- Dark mode: `dark:prose-invert`
- Color themes: `prose-slate`, `prose-zinc`, etc.
- Works perfectly with HTML output from any markdown renderer

### 5.2 tw-prose (Alternative)

| Attribute | Details |
|---|---|
| **Package** | [`tw-prose`](https://dev.to/gridou/announcing-tw-prose-a-css-only-typography-plugin-for-tailwind-css-v4-o8j) |
| **Purpose** | CSS-only typography plugin specifically for Tailwind CSS v4 |

A lighter alternative if you want pure CSS without the JS plugin overhead. Newer and less proven.

### 5.3 Integrating with shadcn/ui

Since shadcn/ui (new-york style) already uses Tailwind, the `prose` classes integrate seamlessly. You can customize prose styles to match shadcn's design tokens:

```css
/* Customize prose to match shadcn theme */
.prose {
  --tw-prose-body: hsl(var(--foreground));
  --tw-prose-headings: hsl(var(--foreground));
  --tw-prose-links: hsl(var(--primary));
  --tw-prose-bold: hsl(var(--foreground));
  --tw-prose-code: hsl(var(--foreground));
  --tw-prose-pre-bg: hsl(var(--muted));
}
```

---

## 6. Syntax Highlighting

### 6.1 Shiki

| Attribute | Details |
|---|---|
| **Package** | [`shiki`](https://www.npmjs.com/package/shiki) |
| **Bundle size** | ~250 kB+ (includes WASM engine) |
| **Quality** | Best-in-class (uses VS Code's TextMate grammar engine) |
| **Maintenance** | Very active |

**Pros:**
- VS Code-quality highlighting (same grammar engine)
- Huge theme library (any VS Code theme)
- Inline styles (no external CSS needed)
- Multiple theme support (light/dark)

**Cons:**
- Heavy bundle for client-side use (~250 kB + WASM)
- Best used server-side or at build time

**Rehype integration:**
- [`@shikijs/rehype`](https://www.npmjs.com/package/@shikijs/rehype) -- official rehype plugin
- [`rehype-pretty-code`](https://www.npmjs.com/package/rehype-pretty-code) -- popular wrapper with extra features (line numbers, line highlighting, word highlighting)

### 6.2 react-shiki (Client-Side Shiki)

| Attribute | Details |
|---|---|
| **Package** | [`react-shiki`](https://www.npmjs.com/package/react-shiki) |
| **Bundle options** | Full (~1.2 MB gz), Web (~695 KB gz), Core (minimal) |
| **Maintenance** | Active |

**Pros:**
- React component and hook API
- Dynamic language loading (only loads what's needed)
- No `dangerouslySetInnerHTML`
- Multi-theme support with CSS `light-dark()`
- Good for dynamic/streamed content (LLM chat UIs, etc.)

**Cons:**
- Large initial bundle even with core option
- Client-side WASM loading

### 6.3 Prism.js

| Attribute | Details |
|---|---|
| **Package** | [`prismjs`](https://www.npmjs.com/package/prismjs) |
| **Bundle size** | ~6 kB core + per-language grammars |
| **Maintenance** | Stalled (Prism v2 development inactive since ~2023) |

**Pros:**
- Very fast, lightweight
- Modular (load only needed languages)
- Large theme collection

**Cons:**
- Development has stalled (v2 never shipped)
- Lower highlighting quality than Shiki
- Requires external CSS for themes

### 6.4 highlight.js

| Attribute | Details |
|---|---|
| **Package** | [`highlight.js`](https://www.npmjs.com/package/highlight.js) |
| **Bundle size** | ~30 kB core |
| **Maintenance** | Active |

**Pros:**
- Auto-detection of language
- 190+ language support
- Actively maintained
- Easy to set up

**Cons:**
- Lower quality than Shiki
- Half the speed of Prism
- Requires external CSS

### 6.5 react-syntax-highlighter

| Attribute | Details |
|---|---|
| **Package** | [`react-syntax-highlighter`](https://www.npmjs.com/package/react-syntax-highlighter) |
| **Maintenance** | Legacy / minimal updates |

A React wrapper around Prism or highlight.js. Widely used but considered legacy. Prefer react-shiki or direct @shikijs/rehype integration for new projects.

### 6.6 Comparison Summary

| Library | Quality | Bundle Size | Speed | Maintenance | Best For |
|---|---|---|---|---|---|
| **Shiki** | Excellent | Heavy (~250 kB) | Slower | Active | Server-side / build-time |
| **react-shiki** | Excellent | Heavy (695 kB-1.2 MB) | Slower | Active | Client-side dynamic content |
| **Prism.js** | Good | Light (~6 kB) | Fastest | Stalled | Legacy projects |
| **highlight.js** | Good | Medium (~30 kB) | Fast | Active | Simple setups |
| **rehype-pretty-code** | Excellent | N/A (build-time) | N/A | Active | MDX / remark pipelines |

---

## 7. Recommendation

### For This Stack (React 19 + Vite 7 + Tailwind v4 + Fastify + Monorepo)

#### Primary Approach: react-markdown (client-side) + unified pipeline (server-side)

**Client-side (React front-end):**

| Choice | Package |
|---|---|
| **Markdown renderer** | `react-markdown` |
| **GFM support** | `remark-gfm` |
| **Styling** | `@tailwindcss/typography` (`prose` classes) |
| **Syntax highlighting** | `@shikijs/rehype` or `rehype-pretty-code` (via rehypePlugins) |

```tsx
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <article className="prose dark:prose-invert">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypePrettyCode]}
      >
        {content}
      </Markdown>
    </article>
  );
}
```

**Server-side (Fastify back-end in shared workspace):**

Use the same unified pipeline for server-side rendering when needed (e.g., generating HTML for emails, RSS feeds, or SEO pre-rendering):

```ts
// shared/src/markdown.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";

export async function renderMarkdown(md: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypePrettyCode)
    .use(rehypeStringify)
    .process(md);
  return String(result);
}
```

#### Why This Approach

1. **react-markdown** is the most widely adopted, secure-by-default React markdown renderer. It builds a virtual DOM (no `dangerouslySetInnerHTML`), supports custom component overrides, and has the largest plugin ecosystem.

2. **The unified/remark/rehype pipeline** is shared between client and server. The same plugins and configuration can live in the monorepo's `shared` workspace, ensuring consistent rendering.

3. **@tailwindcss/typography** is the official Tailwind plugin for styling rendered HTML. With v4's CSS-based configuration (`@plugin`), it integrates cleanly. The `prose` classes pair naturally with shadcn/ui's design tokens.

4. **Shiki via rehype-pretty-code** provides VS Code-quality syntax highlighting. When used as a rehype plugin, it integrates directly into the react-markdown pipeline without additional setup. For server-side use, it adds no client bundle cost.

5. **Monorepo advantage**: The shared workspace can export the unified pipeline configuration, remark/rehype plugins, and TypeScript types. Both the Fastify back-end and React front-end import from the same source.

#### Alternative: markdown-to-jsx (if bundle size is critical)

If the ~42 kB bundle of react-markdown is a concern, `markdown-to-jsx` at ~5 kB is a strong lightweight alternative. However, you lose the remark/rehype plugin ecosystem and server-side pipeline sharing.

#### When to Add MDX

Add MDX (`@mdx-js/rollup` in Vite config) later if you need to author static content with embedded React components (e.g., interactive documentation, blog posts with live demos). MDX and react-markdown can coexist -- use MDX for static `.mdx` files and react-markdown for dynamic content from APIs/databases.

### Installation (Bun)

```bash
# Client-side markdown rendering
bun add react-markdown remark-gfm

# Syntax highlighting
bun add rehype-pretty-code shiki

# Tailwind typography
bun add -d @tailwindcss/typography

# Server-side (shared workspace)
bun add unified remark-parse remark-gfm remark-rehype rehype-stringify
```

### Packages to Avoid

| Package | Reason |
|---|---|
| `contentlayer` | Abandoned (Stackbit acquired by Netlify) |
| `react-syntax-highlighter` | Legacy, prefer react-shiki or rehype-pretty-code |
| `prismjs` | Development stalled, Prism v2 never shipped |
| `remarkable` | Superseded by markdown-it |

---

## Sources

- [react-markdown on npm](https://www.npmjs.com/package/react-markdown)
- [react-markdown GitHub](https://github.com/remarkjs/react-markdown)
- [react-markdown React 19 compatibility issue](https://github.com/remarkjs/react-markdown/issues/920)
- [markdown-to-jsx on npm](https://www.npmjs.com/package/markdown-to-jsx)
- [marked on npm](https://www.npmjs.com/package/marked)
- [markdown-it on npm](https://www.npmjs.com/package/markdown-it)
- [MDX official site](https://mdxjs.com/)
- [@mdx-js/rollup on npm](https://www.npmjs.com/package/@mdx-js/rollup)
- [Velite documentation](https://velite.js.org/guide/introduction)
- [Content Collections migration guide](https://www.content-collections.dev/docs/migration/contentlayer)
- [Contentlayer abandonment analysis](https://www.wisp.blog/blog/contentlayer-has-been-abandoned-what-are-the-alternatives)
- [@tailwindcss/typography GitHub](https://github.com/tailwindlabs/tailwindcss-typography)
- [@tailwindcss/typography on npm](https://www.npmjs.com/package/@tailwindcss/typography)
- [tw-prose announcement](https://dev.to/gridou/announcing-tw-prose-a-css-only-typography-plugin-for-tailwind-css-v4-o8j)
- [Shiki official site](https://shiki.matsu.io/)
- [@shikijs/rehype documentation](https://shiki.matsu.io/packages/rehype)
- [rehype-pretty-code documentation](https://rehype-pretty.pages.dev/)
- [react-shiki GitHub](https://github.com/AVGVSTVS96/react-shiki)
- [react-shiki on npm](https://www.npmjs.com/react-shiki)
- [Syntax highlighting comparison](https://npm-compare.com/highlight.js,prismjs,react-syntax-highlighter,shiki)
- [Markdown parser benchmark (May 2025)](https://www.measurethat.net/Benchmarks/Show/34403/1/markdown-parser-performance-comparison-as-of-may-2025)
- [npm-compare: marked vs markdown-it vs remark](https://npm-compare.com/markdown-it,marked,remark,showdown)
- [fastify-markdown GitHub](https://github.com/freezestudio/fastify-markdown)
- [React Markdown Complete Guide 2025 (Strapi)](https://strapi.io/blog/react-markdown-complete-guide-security-styling)
- [Unified ecosystem](https://unifiedjs.com/)
