# buildwithtim.dev — homepage benchmark and redesign options

Research date: 2026-10-06. Every external site was fetched live on that date.
Statements about external sites describe the fetched HTML/text only. Visual
details that a text fetch cannot show (motion, layout, colour) are marked
`[INFERENCE]` or "not observed". Slogans and layout options are **proposals**,
not sourced facts.

---

## 1. Current state (repo)

| Area | What exists | Path |
| --- | --- | --- |
| Page | `HomePage` maps `HOME_SECTIONS` to `<HomeSection>` and renders a `HomeFloatingNav` with scroll-spy (`useActiveHomeSection`) | `front-end/src/features/home/pages/home-page.tsx` |
| Content config | 7 sections, all copy hard-coded: `start` ("Reboot With Me" hero + "Discover" CTA), `for-you` (value-pillars carousel), `for-devs` ("How I work" workflow rows), `proof` ("Proof, honestly" trust strip), `community-and-docs` (recent posts), `secondary-cta` ("Start here" curated posts), `footer` | `front-end/src/features/home/config/home-sections.ts` |
| Hero | Oversized rounded "well" box, H2 + body + dark CTA button, portrait `/images/me.png` anchored bottom-right | `components/home-section-start.tsx` |
| Value pillars | 374-line custom carousel with pointer-tilt cards and paging logic; pillars: "Managing Office culture", "Big Tech independence", "Meditation & Stress management", "Curated Recommendations", "Level Up Engineering" | `components/value-pillars-carousel.tsx`, `components/home-section-carousel.tsx` |
| Workflow rows | Alternating media/text rows (Obsidian pipeline, container-OS desktop, Pi sandbox); media slot is a text placeholder (`mediaLabel`), no real images | `components/home-workflow-rows.tsx` |
| Trust strip | Pill list of "honest" claims incl. Big Tech independence and meditation | `components/home-trust-strip.tsx` |
| Recent posts | `selectRecentPosts` (4 newest by `compareArticles`) in a 2-col card grid linking `/articles/:slug` | `components/home-recent-posts.tsx` |
| Start here | Curated slugs incl. `yoga-nidra-…` and `my-operating-system-is-a-container-image-yes-really` | `components/home-start-here.tsx` |
| Footer | GitHub link + © year + author | `components/home-section-footer.tsx` |
| Floating nav | Pill nav with lucide icons per section + sliding indicator, uses `Badge` | `components/home-floating-nav.tsx`, `lib/home-floating-nav-indicator.ts` |
| Dead code | `hello-button.tsx` is not imported anywhere outside its own file (grep) | `components/hello-button.tsx` |
| Projects | Routes `/projects`, `/projects/:slug`; pure helpers `sortProjectsForDisplay`, `resolveFeaturedProject`, `resolvePriorityProjects` (reusable on home). `ProjectFrontmatter` has `coverImage`, `featured`, `prioritySlot`, `status`, `role`, `links` | `front-end/src/features/projects/lib/project-display.ts`, `shared/src/index.ts` |
| Routes | `/`, `/projects`, `/projects/:slug`, `/articles`, `/articles/:slug` | `front-end/src/App.tsx` |
| Installed shadcn | `badge`, `button`, `card`, `collapsible`, `dropdown-menu`, `sheet` | `front-end/src/shared/components/ui/` |
| Styling | Tailwind v4 (`@theme inline`, `@custom-variant dark`), Adwaita palette vars (`--adw-light-*`, `--adw-dark-*`, `--adw-accent-*`, beige/brown page backgrounds) | `front-end/src/index.css` |
| Stack | React `^19.2.4`, Tailwind `^4.1.18`, `radix-ui ^1.4.3`, `tw-animate-css`, `shadcn ^3.8.5` (dev) | `front-end/package.json` |

**Caveat — `components.json` alias mismatch.** `front-end/components.json`
declares `"ui": "@/components/ui"` and `"utils": "@/lib/utils"`, but the real
files live at `@/shared/components/ui` and `@/shared/lib/utils`
(`front-end/src/lib/` does not exist). Per the
[components.json docs](https://ui.shadcn.com/docs/components-json), "The CLI
uses these values to place generated components in the correct location and
rewrite imports", so `shadcn add` today would write to
`src/components/ui/` and import `@/lib/utils`, which breaks. Fix the aliases to
`@/shared/components/ui` / `@/shared/lib/utils` (and likely `components` →
`@/shared/components`) before adding anything, or pass `-p, --path <path>`
([CLI docs](https://ui.shadcn.com/docs/cli)) — the path flag does not fix the
`utils` import `[INFERENCE]`.

**What the rebrand removes.** Everything tied to the old positioning:
"Reboot With Me" hero + footer copy, `for-you` pillars (office culture, Big
Tech, meditation, shop-like "Curated Recommendations"), trust-strip claims
about independence/meditation, and the yoga-nidra "Start here" slot.

---

## 2. Benchmark (live sites, fetched 2026-10-06)

### 2.1 Personal developer sites / writer-first

**Lee Robinson — [leerob.com](https://leerob.com/)**
- `<title>` "Lee Robinson", meta description "Developer and writer." ([source](https://leerob.com/)).
- No marketing hero: handle "@leerob" heading, then a **Bio** block with a "Default / Long" toggle, then first-person bio: "I'm an engineer and writer. I work on ML at SpaceX (formerly at Cursor) … I've been coding for 15 years and teaching for the second half." ([source](https://leerob.com/)).
- Section order: Bio → **Notes** (10 evergreen topic links: "Things I believe", "Understanding AI", "Developer experience" …) → **Blogs** (title + month/year, plain list) ([source](https://leerob.com/)).
- No newsletter form, project grid, or social-proof block observed on the home page.

**Dan Abramov — [overreacted.io](https://overreacted.io/)**
- Title "overreacted — A blog by Dan Abramov" ([source](https://overreacted.io/)).
- Home page is the full post list only: each entry = H2 title, date, one-line hook (e.g. "How to Fix Any Bug — October 21, 2025 — The joys of vibecoding.") ([source](https://overreacted.io/)). Atom feed advertised ([atom.xml](https://overreacted.io/atom.xml)).
- No hero, projects, newsletter, or nav beyond the logo/byline observed.

**Josh W. Comeau — [joshwcomeau.com](https://www.joshwcomeau.com/)**
- Top nav: "categories", "courses", "goodies", "About" ([source](https://www.joshwcomeau.com/)).
- Main column "Articles and Tutorials": card per post with title, optional subtitle, 2–3 sentence teaser, "Read more" ([source](https://www.joshwcomeau.com/)).
- Sidebar-style blocks: "Browse By Category" (CSS, React, Animation …) and "Popular Content" (10 evergreen guides) ([source](https://www.joshwcomeau.com/)).
- Newsletter: "Want to know when I publish new content? Enter your email to join my free newsletter" ([source](https://www.joshwcomeau.com/)).
- Footer: categories, "Interactive Courses", About/Contact, plus controls "Search", "Disable sounds", "Activate dark mode", "RSS Feed", social links ([source](https://www.joshwcomeau.com/)). Hero tagline text not present in fetched HTML — not observed.

**Kent C. Dodds — [kentcdodds.com](https://kentcdodds.com/)**
- Nav: Blog, Talks, Courses, Better, Discord, Calls, About, Search, "Switch to dark mode" ([source](https://kentcdodds.com/)).
- Hero (mission formula): "Helping people make the world a better place through quality software." with 3 CTAs "Read the blog", "Take a course", "Learn more about Kent", plus an "Introduction video (2:13)" ([source](https://kentcdodds.com/)).
- Social proof as numbers: "My 214 blog posts (and counting) have been read 965,253 times by 766,372 people." ([source](https://kentcdodds.com/)).
- Sections: intro → "Having a hard time keeping up with JavaScript?" → Educational blog stats → "Blog recommendations" (date + read time) → "My flagship training" (course cards) → Discord community → personal "Big extreme sports enthusiast" → newsletter "Stay up to date" (first name + email) → large sitemap footer ([source](https://kentcdodds.com/)).

**swyx — [swyx.io](https://swyx.io/)**
- Nav: home, ideas, podcasts, about, subscribe; "Search the notebook… ⌘ K"; "☾ dark" toggle ([source](https://swyx.io/)).
- Hero: name + motto "Learn in Public", then "I write about technology, markets, and networks. Building in public at the frontier of AI." ([source](https://swyx.io/)).
- Sections: "Things worth thinking about" (11 numbered essays § 01–§ 11 with one-line hook + "Read essay →") → "Currently causing interesting trouble" (current projects with ↗) → book promo "The Coding Career Handbook is now free" with "Read free / View source" → "Latest writing & appearances" (typed: podcast / essay / note) → "Selected talks" → newsletter "Stay in correspondence … Join >10,000 readers" + RSS → "Popular writing" / "Popular speaking" ([source](https://swyx.io/)).

**Maggie Appleton — [maggieappleton.com](https://maggieappleton.com/)**
- Hero formula: "Maggie makes visual essays about programming, design, and anthropology." + "Designer, anthropologist, and mediocre developer" + "Currently exploring AI & software engineering at GitHub Next" ([source](https://maggieappleton.com/)).
- Content is typed by format with one-line descriptors: Essays, Notes, Patterns, Smidgeons, Talks, Podcasts, Library, Antilibrary; home shows 4 essays (with relative age "about 1 year ago"), ~12 notes, patterns ([source](https://maggieappleton.com/)).
- Has a "Now" nav item ([/now](https://maggieappleton.com/now)) and a "Digital garden" explainer ([source](https://maggieappleton.com/)).

**Tania Rascia — [tania.dev](https://www.tania.dev/)**
- Intro: "I'm Tania, software engineer and open-source creator. This is my digital garden. 🌱" then "Hey, I'm Tania! Principal software engineer, writer, all-around nerd." ([source](https://www.tania.dev/)).
- **Timeline** as bio ("2007–2014 Professional chef … 2014–2020 Career change … 2021–now Principal software engineer") with inline proof: "177 posts, 40+ publications, and 20,000+ stars on GitHub" ([source](https://www.tania.dev/)).
- "Latest" (title, date, tags) → **"Shelves"**: "Hand-picked paths through everything I've written" with counts (Fundamentals 12, Deep dives 8 …) → "Series" ([source](https://www.tania.dev/)).
- Nav: Blog, Shelves, Projects, About me, plus "Color"/"Theme" controls, email signup, RSS ([source](https://www.tania.dev/)).

### 2.2 Portfolio / showcase-first

**Brittany Chiang — [brittanychiang.com](https://brittanychiang.com/)**
- Hero formula: name → role "Frontend Engineer" → one line "I build accessible, pixel-perfect experiences for the web." → icon socials (GitHub, LinkedIn, CodePen, Instagram, Goodreads) ([source](https://brittanychiang.com/)).
- Sections: About → **Experience** (date range, title · company, paragraph, tech tags) + "View Full Résumé" → **Projects** (title, description, tech tags, screenshot, metric badge "100k+ Installs") + "View Full Project Archive" → **Writing** (year + thumbnail + title) ([source](https://brittanychiang.com/)).
- Easter egg: "Click to time travel" Tardis GIF ([source](https://brittanychiang.com/)). Layout (sticky left column) not verifiable from text `[INFERENCE]`.

**Paco Coursey — [paco.me](https://paco.me/)**
- Hero: "Crafting interfaces. Building polished software and web experiences. Experimenting with magical details in user interfaces. Webmaster at Linear." ([source](https://paco.me/)).
- Sections, each a short labelled list: Building (Craft) → **Projects** (⌘K, Writer, Next Themes — name + one-line description) → **Writing** (2 posts + "All writing") → **Now** (paragraphs on current focus and music) → Connect ([source](https://paco.me/)).

**Rauno Freiberg — [rauno.me](https://rauno.me/)**
- One-sentence hero: "Rauno Freiberg is an Estonian interaction designer working with Vercel and Devouring Details" ([source](https://rauno.me/)).
- Home links to Craft, Projects, Notes ("Field Notes"), Twitter/GitHub/Email; ends with a manifesto "Make it fast. Make it beautiful. … Make it." ([source](https://rauno.me/)). Most content is client-rendered; interactions not observed.

**Anthony Fu — [antfu.me](https://antfu.me/)**
- Nav: Blog, Projects, Talks, Sponsors ([source](https://antfu.me/)).
- Hero: "Hey! I'm Anthony Fu, a fanatical open sourceror and design engineer." then credential list "Creator of Vitest, Slidev, VueUse, UnoCSS …", "Core team of Vue, Nuxt, Vite" ([source](https://antfu.me/)).
- Prose bio links out to projects, talks, blog, streams, photos, and a **uses** page ("here are the hardware/software I use" → [/use](https://antfu.me/use)) ([source](https://antfu.me/)).
- Ends with "Find me on" socials and a **Sponsor** CTA ([source](https://antfu.me/)).

### 2.3 Indie-maker / product landing

**Pieter Levels — [levels.io](https://levels.io/)**
- Nav: home, stats, projects, rss, api, llms, mcp, investments, contact; list controls "Sort: latest · oldest · views …", "Filter: all · blog · X posts …", "Layout: list · cards" ([source](https://levels.io/)).
- Hero formula (what I build + proof of independence): "Hi. I'm @levelsio and you've found my blog! I build internet startups by myself: Nomads.com, Remote OK, Hoodmaps, Photo AI and Interior AI. All bootstrapped without funding and just me coding everything on my laptop." ([source](https://levels.io/)).
- Newsletter with social proof, repeated twice: "Never miss a post: 183,663 people read my posts in full by email … Subscribe" + Telegram alternative ([source](https://levels.io/)).
- "Pinned" posts (incl. "List of all my projects ever", "How I build my minimum viable products") → dense date-grouped feed ([source](https://levels.io/)).

**Marc Lou — [marclou.com](https://marclou.com/)**
- Domain serves his "Indie Page" (canonical `indiepa.ge/marclou`) ([source](https://marclou.com/)).
- Hero: avatar, location "Bali", revenue "$311.1k/month", headline "I've built 36 startups solo.", links "My book" and "My newsletter (50k readers)", hook "How I find startup ideas, launch fast, and get profitable 👇" ([source](https://marclou.com/)).
- Product list = whole page: logo, name, **MRR badge**, one-line benefit in a "X in days, not months" formula ("ShipFast $1.7k/mo Ship your startup in days, not months"), plus "Acquired"/"Discontinued" status labels ([source](https://marclou.com/)).
- Footer: socials + "Built w/ Build your Indie Page" ([source](https://marclou.com/)).

### 2.4 Benchmarked dimensions not observable by text fetch

Motion, scroll effects, hover states, and exact layout were not observable
from HTML text. Dark mode is only claimed where a toggle label appeared in the
fetched markup: Josh Comeau, Kent C. Dodds, swyx, Tania Rascia (links above).

---

## 3. Recurring patterns

| Pattern | Sites using it (observed) | Fit for buildwithtim.dev |
| --- | --- | --- |
| One-sentence identity hero: name + role + what I build/write | [Brittany](https://brittanychiang.com/), [Paco](https://paco.me/), [Rauno](https://rauno.me/), [Maggie](https://maggieappleton.com/), [Anthony Fu](https://antfu.me/), [Lee](https://leerob.com/) | **High** — domain already says "build"; replaces "Reboot With Me" |
| Concrete proof in hero (named products, employers, numbers) | [levels.io](https://levels.io/), [Marc Lou](https://marclou.com/), [Anthony Fu](https://antfu.me/), [Kent](https://kentcdodds.com/), [Tania](https://www.tania.dev/) | **Medium** — use real repo/project names; no invented metrics (keeps the current "honest" stance) |
| Plain chronological writing list (title + date + 1-line hook) | [overreacted](https://overreacted.io/), [Lee](https://leerob.com/), [Paco](https://paco.me/), [Tania](https://www.tania.dev/) | **High** — `selectRecentPosts` already exists |
| Curated "start here"/evergreen block | [Lee "Notes"](https://leerob.com/), [Josh "Popular Content"](https://www.joshwcomeau.com/), [swyx numbered essays](https://swyx.io/), [Tania "Shelves"](https://www.tania.dev/), [levels.io "Pinned"](https://levels.io/) | **High** — `home-start-here.tsx` exists; re-curate slugs |
| Projects as compact list (name + one-liner) | [Paco](https://paco.me/), [Marc Lou](https://marclou.com/), [swyx "Currently…"](https://swyx.io/) | **High** for home; full cards stay on `/projects` |
| Projects as rich cards (screenshot + tags + metric) | [Brittany](https://brittanychiang.com/) | **Medium** — `coverImage` exists in frontmatter |
| Status/metric badge per project | [Marc Lou](https://marclou.com/) (MRR, Acquired), [Brittany](https://brittanychiang.com/) ("100k+ Installs") | **Medium** — `status` field exists; use status not revenue |
| Newsletter capture with reader count | [levels.io](https://levels.io/), [swyx](https://swyx.io/), [Kent](https://kentcdodds.com/), [Josh](https://www.joshwcomeau.com/), [Marc Lou](https://marclou.com/) | **Low now** — no newsletter backend; RSS link is the honest substitute `[INFERENCE]` |
| RSS link | [Josh](https://www.joshwcomeau.com/), [swyx](https://swyx.io/), [Tania](https://www.tania.dev/), [levels.io](https://levels.io/), [overreacted](https://overreacted.io/atom.xml) | **Medium** — needs a feed endpoint `[INFERENCE]` |
| "Now" section/page | [Paco](https://paco.me/), [Maggie](https://maggieappleton.com/now) | **High** — cheap, fits "build in public" |
| "Uses" page | [Anthony Fu /use](https://antfu.me/use) | **High** — the existing "How I work" stack content (Obsidian, container-OS, Pi) is a natural `/uses` |
| ⌘K search | [swyx](https://swyx.io/), [Paco's ⌘K project](https://paco.me/) | **Low/Medium** — nice-to-have once content grows |
| Typed content (essay/note/podcast) or categories | [Maggie](https://maggieappleton.com/), [swyx](https://swyx.io/), [Josh](https://www.joshwcomeau.com/) | **Medium** — depends on article tags |
| Timeline/career bio | [Tania](https://www.tania.dev/), [Brittany Experience](https://brittanychiang.com/) | **Low** on home; belongs on About |
| Multi-CTA hero (read / take course / about) | [Kent](https://kentcdodds.com/) | **Medium** — two CTAs: "Read articles", "See projects" |
| Personal touch / easter egg | [Brittany Tardis](https://brittanychiang.com/), [Rauno manifesto](https://rauno.me/), [Josh "Disable sounds"](https://www.joshwcomeau.com/) | **Medium** — the portrait already gives personality |
| Big sitemap footer | [Kent](https://kentcdodds.com/), [Josh](https://www.joshwcomeau.com/) | **Low** — site has 3 sections; small footer suffices |

---

## 4. shadcn/ui components to consider

Installed today (`front-end/src/shared/components/ui/`): badge, button, card,
collapsible, dropdown-menu, sheet. Source list:
[ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components).
`bunx --bun shadcn@latest add …` is the Bun form shown in the official
[Vite installation page](https://ui.shadcn.com/docs/installation/vite).
**Fix the `components.json` aliases first (see §1).**

| Component | Install | Homepage use case | Extra dep per docs |
| --- | --- | --- | --- |
| [Avatar](https://ui.shadcn.com/docs/components/avatar) | `bunx --bun shadcn@latest add avatar` | Small portrait next to the name in a compact hero (Lee/Marc-style) | `radix-ui` (already installed) |
| [Separator](https://ui.shadcn.com/docs/components/separator) | `bunx --bun shadcn@latest add separator` | Thin dividers between Writing / Projects / Now lists | `radix-ui` |
| [Item](https://ui.shadcn.com/docs/components/item) | `bunx --bun shadcn@latest add item` | "media, title, description, and actions" row — fits post rows and project rows (Paco/Marc Lou list format) | none listed |
| [Hover Card](https://ui.shadcn.com/docs/components/hover-card) | `bunx --bun shadcn@latest add hover-card` | Preview a project (cover + status) on hover of its name; docs: "For sighted users", so never the only path to info | `radix-ui` |
| [Tooltip](https://ui.shadcn.com/docs/components/tooltip) | `bunx --bun shadcn@latest add tooltip` | Labels for icon-only social links | `radix-ui`; docs require a `TooltipProvider` at app root |
| [Tabs](https://ui.shadcn.com/docs/components/tabs) | `bunx --bun shadcn@latest add tabs` | Switch "Latest / Popular" posts, or "Articles / Projects" in one block | `radix-ui` |
| [Toggle Group](https://ui.shadcn.com/docs/components/toggle-group) | `bunx --bun shadcn@latest add toggle-group` | Leerob-style "Default / Long" bio toggle, or levels.io-style "list / cards" layout switch | `radix-ui` |
| [Aspect Ratio](https://ui.shadcn.com/docs/components/aspect-ratio) | `bunx --bun shadcn@latest add aspect-ratio` | Consistent project cover images in cards | `radix-ui` |
| [Navigation Menu](https://ui.shadcn.com/docs/components/navigation-menu) | `bunx --bun shadcn@latest add navigation-menu` | Top site nav (Articles, Projects, Now, Uses, About) replacing the section-icon floating nav | `radix-ui` |
| [Command](https://ui.shadcn.com/docs/components/command) | `bunx --bun shadcn@latest add command` | ⌘K search over articles/projects (swyx pattern) | `cmdk` (new dependency → needs approval) |
| [Kbd](https://ui.shadcn.com/docs/components/kbd) | `bunx --bun shadcn@latest add kbd` | "⌘K" hint next to search | none listed |
| [Carousel](https://ui.shadcn.com/docs/components/carousel) | `bunx --bun shadcn@latest add carousel` | Only if a project carousel is kept; could replace the 374-line custom carousel | `embla-carousel-react` (new dependency → needs approval) |
| [Input](https://ui.shadcn.com/docs/components/input) / [Field](https://ui.shadcn.com/docs/components/field) / [Input Group](https://ui.shadcn.com/docs/components/input-group) | `bunx --bun shadcn@latest add input field input-group` | Future newsletter form (Option C) | none listed |
| [Empty](https://ui.shadcn.com/docs/components/empty) | `bunx --bun shadcn@latest add empty` | Graceful state when no projects/posts load | none listed |
| [Skeleton](https://ui.shadcn.com/docs/components/skeleton) | `bunx --bun shadcn@latest add skeleton` | Loading rows while `httpContentLoader` fetches posts | none listed `[INFERENCE]` (not checked) |

**Not available officially:** no marquee/ticker, bento-grid, hero, or
"landing page" component is in the official
[components list](https://ui.shadcn.com/docs/components), and the official
[Blocks page](https://ui.shadcn.com/blocks) only exposes Featured, Sidebar,
Login and Signup categories (dashboard, sidebar, login blocks). Bento grids
and marquees would be hand-built with Tailwind grid / CSS animation, or pulled
from the community [registry directory](https://ui.shadcn.com/docs/directory)
(third-party, needs vetting) `[INFERENCE]`.

**React 19 / Tailwind v4 caveats (per docs):**
- "All components are updated for Tailwind v4 and React 19", forwardRefs removed, each primitive has `data-slot`, `toast` deprecated "in favor of `sonner`", and `tailwindcss-animate` deprecated for `tw-animate-css` ([Tailwind v4 page](https://ui.shadcn.com/docs/tailwind-v4)). This repo already uses `tw-animate-css`.
- Peer-dependency errors with React 19 are npm-only; "PNPM and Bun will only show a silent warning" and no flags are needed for bun ([React 19 page](https://ui.shadcn.com/docs/react-19)). Do **not** use `--force`/`--legacy-peer-deps` (repo rule).
- For Tailwind v4, `tailwind.config` stays blank in `components.json`; `style` and `baseColor` "cannot be changed after initialization" ([components.json docs](https://ui.shadcn.com/docs/components-json)).
- New components will use shadcn semantic tokens (`bg-card`, `text-muted-foreground` …); they must map to the `--adw-*` palette via the existing `@theme inline` block or they will look off-brand `[INFERENCE]`.

---

## 5. Positioning for buildwithtim.dev (proposals, not sourced)

Observed formulas this is derived from:
- **Role + verb + object**: "I build accessible, pixel-perfect experiences for the web." ([Brittany](https://brittanychiang.com/))
- **Name + makes + format + topics**: "Maggie makes visual essays about programming, design, and anthropology." ([Maggie](https://maggieappleton.com/))
- **Gerund stack**: "Crafting interfaces. Building polished software…" ([Paco](https://paco.me/))
- **What I build + how**: "I build internet startups by myself … just me coding everything on my laptop." ([levels.io](https://levels.io/))
- **Engineer and writer**: "I'm an engineer and writer." ([Lee](https://leerob.com/))

Candidates (all **proposals**):
1. **"Build with Tim."** — sub: *"I'm Tim van Oudheusden, a software engineer. I build small, self-hosted tools and write down how they work."*
2. **"I build things in the open — and write down how."** — sub lists 2–3 real projects by name (levels.io pattern).
3. **"Tim van Oudheusden — software engineer. Building in public, one project at a time."**
4. **"Software engineer who ships side projects and writes the build notes."**
5. **"Build along."** — sub: *"Projects I'm building, and the articles that explain every decision."* (invites the reader; the domain reads as an invitation)
6. **"Notes from the workbench."** — sub: *"Projects, write-ups, and the tools behind them, by Tim van Oudheusden."*

Recommendation: #1 or #3. They state name, role, and the two things the
site still contains (projects + articles), and they repeat the domain, which
helps recall `[INFERENCE]`.

---

## 6. Layout options

Shared across all options: remove `value-pillars-carousel.tsx`,
`home-section-carousel.tsx`, `home-trust-strip.tsx`, the old copy in
`home-sections.ts`, the floating section nav (+ its hook/lib) where noted, and
the unused `hello-button.tsx`. Re-curate `HOME_START_HERE_SLUGS`.

### Option A — Minimal writer-first (Lee Robinson / overreacted / Paco)

Section order:
1. Compact hero: Avatar + name + one-line headline + 2 inline links (Articles, Projects) + socials.
2. Now (2–3 sentences, current build).
3. Writing: 5–8 newest posts as rows (title · date · 1-line description) + "All articles".
4. Projects: 3 rows (name · status badge · one-liner) via `resolvePriorityProjects` + "All projects".
5. Small footer (GitHub, RSS, ©).

- **Reuse:** `selectRecentPosts`/`RecentPostsList` (restyle as rows), `resolvePriorityProjects`, `Badge`, `home-section-footer.tsx`.
- **Remove:** hero well/portrait layout, carousel, workflow rows (move to a `/uses` page), trust strip, floating nav + `use-active-home-section`, `home-section-shell` variants.
- **shadcn:** avatar, separator, item, (tooltip for icon links).
- **Effort:** S.
- **Pros:** fastest; content-forward; nothing invented; mirrors the most-cited dev blogs; loads fast.
- **Cons:** projects are under-sold; little visual identity; the portrait is shrunk.

### Option B — Portfolio showcase (Brittany Chiang / Anthony Fu + bento)

Section order:
1. Hero: name, role, headline, portrait (keep current large portrait), CTA pair "See projects" / "Read articles".
2. Featured project: large card (cover, role, status, links) via `resolveFeaturedProject`.
3. Bento grid: 3–5 priority projects (mixed card sizes, `coverImage`).
4. "How I build": 3 tool cards (Obsidian pipeline, container-OS, Pi sandbox) linking to their articles / `/uses`.
5. Latest writing (4 posts) + "Start here" tabs.
6. Footer.

- **Reuse:** `HomeSectionStart` (new copy), `resolveFeaturedProject`/`resolvePriorityProjects`, `Card`, `Badge`, workflow content (as cards), recent posts, start-here.
- **Remove:** carousel, trust strip; floating nav optional.
- **shadcn:** aspect-ratio, hover-card, tabs, separator, tooltip; bento grid is custom Tailwind grid (no official component).
- **Effort:** M (needs real project cover images and bento responsive design).
- **Pros:** makes "build" visible; uses existing project frontmatter fully; strongest visual identity.
- **Cons:** looks thin if there are only 2–3 projects; cover images must exist; more design/test surface.

### Option C — Maker / product landing (levels.io / Marc Lou / Kent C. Dodds)

Section order:
1. Hero: "what I build + proof" sentence naming products, primary CTA "Follow the build" (newsletter/RSS), secondary "See projects".
2. Product list with status badges (Marc Lou format).
3. Social proof (counts: stars, posts, readers).
4. Pinned posts + latest feed.
5. Newsletter block (repeated).
6. Footer.

- **Reuse:** hero component, `Badge`, recent posts, start-here (as "Pinned").
- **Remove:** carousel, workflow rows, trust strip, floating nav.
- **shadcn:** input, field, input-group, item, separator; sonner for submit feedback (new deps).
- **Effort:** L (newsletter needs a back-end route, storage, privacy/consent; social proof needs real numbers).
- **Pros:** highest conversion intent; strong "build in public" signal.
- **Cons:** relies on metrics and a mailing list the site does not have; conflicts with the current "does not invent metrics" principle; empty proof looks worse than none.

### Recommendation

**Ship Option A now, with one element of B: a single "Featured project" card
between the hero and the writing list.** Rationale:
- Matches what the site actually has (articles + a few projects) and what the most respected developer sites observed here do: identity sentence, then lists ([Lee](https://leerob.com/), [overreacted](https://overreacted.io/), [Paco](https://paco.me/)).
- One featured card answers "build" in the domain without needing a full bento set; `resolveFeaturedProject` already exists.
- Small effort (S→M), only `radix-ui`-based shadcn additions (avatar, separator, item, aspect-ratio) — no new npm dependencies.
- Deletes the largest bespoke code (374-line carousel, floating nav + scroll-spy) instead of re-skinning it.
- Moves the "How I work" stack to a `/uses` page and adds a short "Now" block — two cheap, widely used patterns ([antfu /use](https://antfu.me/use), [Maggie /now](https://maggieappleton.com/now)).
- Grows into B (bento) once there are ≥5 projects with covers, and into C only when a newsletter actually exists `[INFERENCE]`.
