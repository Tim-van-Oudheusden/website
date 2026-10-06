# Reference: brittanychiang.com — "Experience" section

Source: <https://brittanychiang.com/#experience> (captured 2026-10-07, Chromium headless shell 1234 via Playwright, `deviceScaleFactor: 1`).
Stylesheet: `https://brittanychiang.com/_next/static/css/1205f04d95fac248.css` (Tailwind **v3** output, Next.js app).
Every value below was read from `getComputedStyle`, `getBoundingClientRect` or the shipped CSS unless marked `[INFERENCE]` or **PROPOSAL**.

Reference colours are Tailwind `slate`/`teal` and appear here **for reference only**. Map them to the Adwaita tokens listed in the last section.

## Screenshots

| State | File |
|---|---|
| Desktop 1440, idle (sticky left column + Experience list) | [experience-desktop-1440-default.png](assets/brittanychiang/experience-desktop-1440-default.png) |
| Desktop 1440, hovering item 2 (card bg + other items dimmed) | [experience-desktop-1440-hover.png](assets/brittanychiang/experience-desktop-1440-hover.png) |
| Desktop 1440, keyboard focus (Tab) on item 2 title link | [experience-desktop-1440-focus.png](assets/brittanychiang/experience-desktop-1440-focus.png) |
| Desktop 1440, whole section (element screenshot) | [experience-desktop-1440-section-full.png](assets/brittanychiang/experience-desktop-1440-section-full.png) |
| Desktop 1440, viewport scrolled to section | [experience-desktop-1440-viewport-sticky.png](assets/brittanychiang/experience-desktop-1440-viewport-sticky.png) |
| "View Full Résumé" link, hovered | [resume-link-hover.png](assets/brittanychiang/resume-link-hover.png) |
| Tablet 768, single item (2-col grid, no hover card) | [experience-tablet-768-item.png](assets/brittanychiang/experience-tablet-768-item.png) |
| Mobile 390, section top (heading bar + stacked date) | [experience-mobile-390-top.png](assets/brittanychiang/experience-mobile-390-top.png) |
| Mobile 390, sticky "EXPERIENCE" bar while scrolling | [experience-mobile-390-sticky-heading.png](assets/brittanychiang/experience-mobile-390-sticky-heading.png) |
| Mobile 390, whole section | [experience-mobile-390-section-full.png](assets/brittanychiang/experience-mobile-390-section-full.png) |

**Light/dark:** the site is **dark only**. There are no `prefers-color-scheme` rules and no `.dark` variant in the CSS, `body` is `bg-slate-900` (`rgb(15 23 42)`), and `<meta name="theme-color" content="#0f172a">`. No light-mode screenshots exist because there is no light mode.

## Is it a "vertical timeline"?

**No.** The original has **no vertical line, rail, dots, or connectors**. I checked every element in `#experience`: none has a non-zero border, and no `::before`/`::after` has `content`. The "timeline" effect comes only from:
1. an ordered list (`<ol>`) sorted newest → oldest,
2. a fixed left date column (2/8 of the grid) that forms a visual "spine" of dates,
3. 48 px of rhythm between items (`mb-12`).

A **PROPOSAL** for adding a real rail in the same style is at the end.

## Page-level layout context

```
div.mx-auto.min-h-screen.max-w-screen-xl.px-6.py-12.md:px-12.md:py-16.lg:py-0   (max-width 1280px)
└─ div.lg:flex.lg:justify-between.lg:gap-4
   ├─ header.lg:sticky.lg:top-0.lg:flex.lg:max-h-screen.lg:w-[48%].lg:flex-col.lg:justify-between.lg:py-24
   │    (name, tagline, in-page nav ABOUT/EXPERIENCE/PROJECTS, socials)  ← sticky LEFT column at ≥1024
   └─ main.pt-24.lg:w-[52%].lg:py-24
        ├─ section#about
        ├─ section#experience   ← this doc
        ├─ section#projects
        └─ section#writing
```

| Breakpoint | Wrapper padding | Left `header` | `main` (right col) | `#experience` margin-bottom | scroll-margin-top |
|---|---|---|---|---|---|
| 1440 | 0 48px (`lg:py-0`) | sticky, top 0, w 560.6px (48%), h = 100vh | x=705, w 607.4px (52%), padding 96px 0 | 144px (`lg:mb-36`) | 96px |
| 1024 | 0 48px | sticky, w 437.8px | w 474.2px | 144px | 96px |
| 768 | 64px 48px | static, stacked above | w 672px, padding-top 96px | 96px (`md:mb-24`) | 64px |
| 390 | 48px 24px | static, stacked above | w 342px, padding-top 96px | 64px (`mb-16`) | 64px |

On desktop the left column stays pinned (`position: sticky; top: 0; max-height: 100vh`) while the right column scrolls. The nav items in it are `group flex items-center py-3` links with an `active` class. That is a separate section and out of scope here.

A page-wide "spotlight" sits behind everything (not part of this section): `div.pointer-events-none.fixed.inset-0.z-30.transition.duration-300.lg:absolute` with `background: radial-gradient(600px at <mouseX>px <mouseY>px, rgba(29,78,216,.15), transparent 80%)`. JS updates the gradient position from the cursor `[INFERENCE: mousemove listener; observed 0px 0px at rest]`.

## Section anatomy

```
section#experience  [aria-label="Work experience"]  .mb-16.scroll-mt-16.md:mb-24.lg:mb-36.lg:scroll-mt-24
├─ div (sticky heading bar)  .sticky.top-0.z-20.-mx-6.mb-4.w-screen.bg-slate-900/75.px-6.py-5.backdrop-blur
│  │                         .md:-mx-12.md:px-12  .lg:sr-only.lg:relative.lg:top-auto.lg:mx-auto.lg:w-full.lg:px-0.lg:py-0.lg:opacity-0
│  └─ h2 "Experience"  .text-sm.font-bold.uppercase.tracking-widest.text-slate-200.lg:sr-only
└─ div
   ├─ ol.group/list                                   ← named group for "dim siblings"
   │  └─ li.mb-12   × 6                               ← reveal-on-scroll inline styles (see Motion)
   │     └─ div.group.relative.grid.pb-1.transition-all.sm:grid-cols-8.sm:gap-8.md:gap-4
   │        │   .lg:hover:!opacity-100 .lg:group-hover/list:opacity-50
   │        ├─ div (hover card bg) .absolute.-inset-x-4.-inset-y-4.z-0.hidden.rounded-md.transition
   │        │      .motion-reduce:transition-none.lg:-inset-x-6.lg:block
   │        │      .lg:group-hover:bg-slate-800/50
   │        │      .lg:group-hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)]
   │        │      .lg:group-hover:drop-shadow-lg
   │        ├─ header [aria-label="2024 to Present"] "2024 — Present"
   │        │      .z-10.mb-2.mt-1.text-xs.font-semibold.uppercase.tracking-wide.text-slate-500.sm:col-span-2
   │        └─ div.z-10.sm:col-span-6
   │           ├─ h3.font-medium.leading-snug.text-slate-200
   │           │  ├─ div > a.inline-flex.items-baseline.font-medium.leading-tight.text-slate-200.group/link.text-base
   │           │  │        href=<company site> target=_blank rel="noreferrer noopener"
   │           │  │        aria-label="<Title> at <Company> (opens in a new tab)"
   │           │  │     ├─ span.absolute.-inset-x-4.-inset-y-2.5.hidden.rounded.md:-inset-x-6.md:-inset-y-4.lg:block
   │           │  │     │      ← STRETCHED-LINK overlay: makes the whole card clickable at ≥1024
   │           │  │     └─ span "<Title> · " + span.inline-block "<Company>" + svg(arrow-up-right)
   │           │  └─ (optional, previous titles at same company)
   │           │     div > div.text-slate-500[aria-hidden=true] "Senior Engineer"   (one div per title)
   │           ├─ p.mt-2.text-sm.leading-normal   (description)
   │           ├─ (optional) ul.mt-2.flex.flex-wrap[aria-label="Related links"]
   │           │     li.mr-4 > a.relative.mt-2.inline-flex.items-center.text-sm.font-medium.text-slate-300
   │           │             > svg.mr-1.h-3.w-3 (link/chain icon) + span "MusicKit.js"
   │           └─ ul.mt-2.flex.flex-wrap[aria-label="Technologies used"]
   │                 li.mr-1.5.mt-2 > div.flex.items-center.rounded-full.bg-teal-400/10.px-3.py-1
   │                                     .text-xs.font-medium.leading-5.text-teal-300   "React"
   └─ div.mt-12 (reveal-animated)
      └─ a.inline-flex.items-baseline.font-medium.leading-tight.text-slate-200.font-semibold.group/link.text-base
           href="/resume.pdf" target=_blank rel="noreferrer noopener" aria-label="View Full Résumé (opens in a new tab)"
           └─ span "View Full " + span.inline-block "Résumé" + svg(arrow-up-right)
```

Content observed (6 items): Klaviyo (2024 — Present), Upstatement (2018 — 2024, with "Senior Engineer" and "Engineer" sub-titles), Apple (July — Dec 2017, with 3 related links), Scout Studio (2016 — 2017), Starry (July — Dec 2016, with 2 related links), MullenLowe U.S. (July — Dec 2015). Every title links to the **company website** (e.g. `https://www.klaviyo.com/`), opening in a new tab.

### Arrow icon (title + résumé link)
Heroicons mini `arrow-up-right` (20×20 viewBox, `fill="currentColor"`), rendered at 16×16 (`h-4 w-4`), `ml-1` (4px), resting `translate-y-px` (computed `matrix(1,0,0,1,0,1)`). It sits inside `span.inline-block` with the last word of the label, so it never wraps onto a line by itself.
Path: `M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z` → equivalent to lucide `ArrowUpRight`.

### Related-link icon
Heroicons mini `link` (chain) at 12×12 (`h-3 w-3`), `mr-1`. Equivalent to lucide `Link`.

## Element inventory — measured values

Font: Inter via `next/font` (`__inter_20b187`) with stack `ui-sans-serif, system-ui, …`, and `font-feature-settings: "ss03","cv02","cv11"` on the wrapper (`font-sans`). Body: `leading-relaxed text-slate-400 antialiased`.

### Typography (same at all breakpoints)

| Element | Size / line-height | Weight | Tracking | Transform | Colour (reference) |
|---|---|---|---|---|---|
| `h2` "Experience" (visible < 1024 only) | 14px / 20px | 700 | 0.1em (1.4px) | uppercase | slate-200 `rgb(226 232 240)` |
| Date `header` | 12px / 16px | 600 | 0.025em (0.3px) | uppercase | slate-500 `rgb(100 116 139)` |
| `h3` | 16px / 22px (`leading-snug` 1.375) | 500 | normal | none | slate-200 |
| Title `a` | 16px / 20px (`leading-tight` 1.25) | 500 | normal | none | slate-200 → teal-300 `rgb(94 234 212)` on hover |
| Previous-title lines ("Senior Engineer") | 16px / 22px | 500 | normal | none | slate-500 |
| Description `p` | 14px / 21px (`leading-normal` 1.5) | 400 | normal | none | slate-400 `rgb(148 163 184)` (inherited) |
| Related link | 14px / 20px | 500 | normal | none | slate-300 `rgb(203 213 225)` |
| Tech pill | 12px / 20px (`leading-5`) | 500 | normal | none | teal-300 on `rgba(45,212,191,.10)` |
| "View Full Résumé" | 16px / 20px | 600 | normal | none | slate-200 → teal-300 on hover |

The separator between title and company is a literal ` · ` (U+00B7 middle dot with spaces), set in the same style as the title. The date range uses an em dash with spaces (`2018 — 2024`). Its `aria-label` spells out the range: "2018 to 2024", "July to December 2017".

### Box metrics per breakpoint (item 1, Klaviyo)

| Measure | 1440 | 1024 | 768 | 390 |
|---|---|---|---|---|
| Section / `ol` width | 607.4px | 474.2px | 672px | 342px |
| Row `display` / columns | grid, 8 × ~61.9px | grid, 8 × ~45.3px | grid, 8 × 70px | grid, 1 col (342px) |
| Row gap (column-gap = row-gap) | 16px (`md:gap-4`) | 16px | 16px | 0 (normal) |
| — gap at 640–767px | 32px (`sm:gap-8`) `[from CSS, not screenshotted]` | | | |
| Date column (`col-span-2`) width | 139.8px | 106.5px | 156px | full width, stacked |
| Content column (`col-span-6`) width / x-offset from row | 451.5px / +155px | 351.7px / +122px | 500px / +172px | 342px / 0 |
| Date margin | 4px top, 8px bottom | same | same | same (date sits on its own line above the title) |
| Row padding | 0 0 4px (`pb-1`) | same | same | same |
| `li` margin-bottom | 48px (`mb-12`) | same | same | same |
| Item height | 183px | 259px | 162px | 287px |
| Hover card inset (vs row) | −16px top/bottom, −24px left/right → 655.4 × 215px | −16 / −24 → 522.2 × 291px | `display:none` | `display:none` |
| Hover card radius | 6px (`rounded-md`) | 6px | — | — |
| Stretched-link overlay inset | −16 / −24 (`md:`), radius 4px | same | `display:none` (`lg:block`) | `display:none` |
| Description `margin-top` | 8px | 8px | 8px | 8px |
| Tag `ul` margin-top | 8px, each `li` adds 8px top + 6px right | same | same | same |
| "View Full Résumé" wrapper margin-top | 48px (`mt-12`) | same | same | same |

### Tech pill

| Property | Value |
|---|---|
| Element | `li.mr-1.5.mt-2 > div` (the `div` is the pill; it is **not** a link) |
| Display | `flex; align-items: center` |
| Padding | 4px 12px (`py-1 px-3`) |
| Size (e.g. "JavaScript") | 91 × 28px |
| Radius | 9999px (`rounded-full`) |
| Background | `rgba(45, 212, 191, 0.10)` (teal-400 @ 10%) |
| Text | 12px / 20px, weight 500, `rgb(94 234 212)` (teal-300) |
| Spacing | 6px right, 8px top per pill; wraps via `flex-wrap` |
| Border / shadow | none |
| Hover state | none of its own (dims or undims with its row) |

## Interaction states

### 1. Row hover (only at ≥ 1024px; implemented in pure CSS)

Measured with the pointer over item 2's paragraph, after 400 ms:

| Target | Idle | Hovered row | Other rows |
|---|---|---|---|
| Row `opacity` | 1 | **1** (`lg:hover:!opacity-100`, `!important`) | **0.5** (`lg:group-hover/list:opacity-50`) |
| Card bg `background-color` | transparent | `rgba(30, 41, 59, 0.5)` (slate-800 @ 50%) | transparent |
| Card bg `box-shadow` | none | `inset 0 1px 0 0 rgba(148,163,184,0.1)` (1px top highlight) | none |
| Card bg `filter` | none | `drop-shadow(0 10px 8px rgba(0,0,0,.04)) drop-shadow(0 4px 3px rgba(0,0,0,.1))` (`drop-shadow-lg`) | none |
| Title link colour | slate-200 | teal-300 `rgb(94 234 212)` (global `a:hover` rule; the overlay span is inside the `<a>`, so hovering anywhere on the card is hovering the link) | slate-200 |
| Arrow `transform` | `translate(0, 1px)` | `translate(4px, -4px)` (`group-hover/link:translate-x-1 -translate-y-1`) | rest |

The CSS that ships (Tailwind v3):
```css
@media (min-width:1024px){
  .group\/list:hover .lg\:group-hover\/list\:opacity-50{opacity:.5}
  .lg\:hover\:\!opacity-100:hover{opacity:1!important}
  .group:hover .lg\:group-hover\:bg-slate-800\/50{background-color:rgba(30,41,59,.5)}
  .group:hover .lg\:group-hover\:shadow-\[inset_0_1px_0_0_rgba\(148\2c 163\2c 184\2c 0\.1\)\]{box-shadow:inset 0 1px 0 0 rgba(148,163,184,.1)}
  .group:hover .lg\:group-hover\:drop-shadow-lg{filter:drop-shadow(0 10px 8px rgba(0,0,0,.04)) drop-shadow(0 4px 3px rgba(0,0,0,.1))}
}
a:hover{color:rgb(94 234 212)}
.group\/link:hover .group-hover\/link\:-translate-y-1{--tw-translate-y:-0.25rem}
.group\/link:hover .group-hover\/link\:translate-x-1{--tw-translate-x:0.25rem}
```

How it works: hovering the `ol` (`group/list`) sets every row to 0.5 opacity, and the row under the pointer overrides itself back to 1 with `!important`. The card background is a separate absolutely positioned `div` at `z-0`, with date and content at `z-10`, so it can bleed 24px/16px outside the text column without changing layout.

**Quirk (observed):** with the pointer in the 48px gap *between* items (inside the `ol` but over no row; tested at (904, 640)), **all six rows dim to 0.5** and none is highlighted.

**Timing:**
- Row: `transition-all 150ms cubic-bezier(0.4, 0, 0.2, 1)`.
- Card bg: `transition` (colour, bg, opacity, box-shadow, transform, filter, …) `150ms cubic-bezier(0.4, 0, 0.2, 1)`, disabled under `prefers-reduced-motion` (`motion-reduce:transition-none`).
- Arrow: `transition-transform 150ms cubic-bezier(0.4, 0, 0.2, 1)`, `motion-reduce:transition-none`.
- Title colour: the `<a>` has no `transition-*` class, yet the 70 ms sample showed an interpolated colour `rgb(134 233 221)` (between slate-200 and teal-300), so the colour does fade over roughly the same 150 ms. I did not identify the rule responsible `[INFERENCE: some inherited or base transition; reproduce as a 150 ms colour transition]`.
- Mid-transition sample at ~70 ms: other rows 0.65 opacity, card bg alpha 0.35, arrow `translate(2.8px, -2.5px)`. This confirms a ~150 ms ease-out-ish curve.

### 2. Keyboard focus (`:focus-visible`)

Tabbing onto item 2's title link gave this (see focus screenshot):
- **No** card background, **no** dimming of siblings. The hover card is driven only by `:hover`; there is no `group-focus-within` rule.
- Arrow moves to `translate(4px, -4px)` (`group-focus-visible/link:` variants).
- Link colour stays slate-200 (there is no `a:focus-visible` colour rule).
- Outline: the browser default (`outline: auto 1px`, offset 1px). It is drawn around the inline text box of the link only, not the stretched overlay. The site defines no custom focus ring.
- Tab order inside a row: title link → related links (if any) → next row. Tech pills are not focusable.

### 3. "View Full Résumé"
- Hover: colour → teal-300 (`a:hover`), arrow → `translate(4px, -4px)`, 150 ms.
- Focus-visible: arrow translates the same way, plus the default outline.
- No underline in any state (`text-decoration: none`, no border-bottom).

### 4. Related links (Apple, Starry)
They are `position: relative`, which puts them above the stretched-link overlay so they stay clickable. On hover the colour goes from slate-300 to teal-300 (`a:hover`). There is no transition.

## Motion: reveal on scroll

Each `li` and the résumé wrapper carry inline styles that change from `opacity: 0; filter: blur(4px); transform: translateY(10px)` (as first rendered) to `opacity: 1; filter: blur(0px); transform: none` when the element scrolls into view. This was observed on items 5–6, which were still at opacity 0 / blur 4px until scrolled to. The library is likely Framer Motion / `motion` `whileInView` `[INFERENCE: inline style pattern; duration and easing not measured]`. The `ol` itself is not animated. The mobile sticky heading bar starts at `opacity:0; blur(4px); translateY(10px)` and reveals the same way.

## Responsive behaviour

| Range | Behaviour |
|---|---|
| < 640px | Single column. The date `header` sits **above** the title as a small uppercase slate-500 line (12px/16px, 600, `mt-1 mb-2`), so it reads as an eyebrow. No hover card, no dimming, and no stretched overlay; only the title text is clickable. A sticky full-bleed "EXPERIENCE" bar (`w-screen`, `-mx-6 px-6 py-5`, `bg-slate-900/75`, `backdrop-blur` 8px, `z-20`, `top:0`) pins to the top while the section scrolls (bar height 60px). |
| 640–767px | `sm:grid-cols-8 sm:gap-8`: date takes cols 1–2, content cols 3–8, gap 32px. Still no hover card. Sticky heading bar still present. |
| 768–1023px | Same grid, gap 16px (`md:gap-4`). Heading bar padding becomes `-mx-12 px-12`. The overlay span gets `md:` insets but stays hidden. Left `header` is stacked above `main`. |
| ≥ 1024px | Two-column page: left `header` 48% sticky, right `main` 52%. The section `h2` becomes `sr-only` (the left nav labels the section instead). Hover card, sibling dimming and stretched link are enabled. |

## Accessibility notes (observed)

- Landmark: `<section id="experience" aria-label="Work experience">` plus a real `h2` "Experience". The `h2` is visually hidden (`lg:sr-only`) at desktop but always in the outline. Page outline: `h1` name → `h2` tagline → `h2` About → `h2` Experience → `h3` × 6.
- `ol` conveys order. Each item's date is a `<header>` element inside the row with an `aria-label` spelling out the range ("2018 to 2024", "July to December 2017"), so screen readers don't announce "dash".
- The link `aria-label` replaces the visible "·" pattern: "Lead Engineer at Upstatement (opens in a new tab)". The visible previous titles are `aria-hidden="true"`, so they are **not announced**. This is a deliberate trade-off that hides information from AT.
- Every external link has `target="_blank" rel="noreferrer noopener"` and announces "(opens in a new tab)" via `aria-label`.
- Tech list: `ul[aria-label="Technologies used"]`. Related links: `ul[aria-label="Related links"]`.
- Decorative SVGs are `aria-hidden="true"`.
- `prefers-reduced-motion`: card and arrow transitions are disabled. The row opacity `transition-all` is **not** gated `[observed: no motion-reduce class on the row]`.
- Weakness: the hover-only card means keyboard users get no equivalent highlight. The focus ring is the UA default around the inline text.

## PROPOSAL — vertical timeline rail in the same visual language

Not present on the original. This is a suggestion that keeps its restraint:

```
 date col (2/8)        rail       content col (6/8)
 2024 — PRESENT        ●──        Senior Frontend Engineer · Klaviyo ↗
                       │          Build and maintain …
                       │          [JavaScript] [TypeScript] …
                       │
 2018 — 2024           ○──        Lead Engineer · Upstatement ↗
                       │          …
```

- **Rail:** `ol` gets `relative`; one `::before` (or an `aria-hidden` div) at the column boundary: `absolute top-2 bottom-0 w-px bg-border` (≈ slate-800 equivalent → Adwaita `--border`/`--adw-sidebar-border-color`). At ≥ 640px place it in the 16–32px grid gap, i.e. `left: calc(25% - gap/2)`. Simpler: give the content column `relative` and put the rail at `-left-[calc(var(--gap)/2)]`. Below 640px move the rail to the far left (`left-0`) and add `pl-6` to each row so the date eyebrow and content sit right of it.
- **Node dots:** per row, an `aria-hidden` `span` of 9×9px, `rounded-full`, `ring-4 ring-background` (masks the line behind it), aligned to the date baseline (`top: 6px`, matching the date's `mt-1` + half its 16px line). Current role: filled accent (`--adw-accent-color`). Past roles: `bg-background border border-muted-foreground`.
- **Hover/focus coupling:** reuse the row `group`. On `lg:group-hover` / `group-focus-within`, the dot fills with accent and scales to 1.25, `transition 150ms cubic-bezier(.4,0,.2,1)`, `motion-reduce:transition-none`. The rail itself never dims. Exclude it from the `opacity-50` by placing it on the `ol` (outside the rows), so the timeline stays readable while siblings dim.
- **Hover card:** it bleeds 24px left of the date column at lg and would cover the dot. Either keep the card on the content column only (`-inset-x-6` → `left` starts at the rail + 12px), or give the dot `z-20` so it sits above the card.
- Keep everything decorative `aria-hidden`. The `ol` order already conveys chronology.

## Adaptation notes for buildwithtim.dev

Keep the structure and behaviour. Swap the palette for Adwaita via the existing shadcn tokens in `front-end/src/index.css` (`--background`→`--adw-window-bg-color`, `--card`→`--adw-view-bg-color`, `--muted-foreground`, `--accent`, `--border`, `--ring`→`--adw-accent-color`). Unlike the original, the site has light **and** dark modes (`@custom-variant dark (&:is(.dark *))`), so every state must be checked in both.

| Part | Reference implementation | buildwithtim.dev mapping |
|---|---|---|
| Section wrapper + `h2` | `section[aria-label]` + `h2` uppercase 14px/700/0.1em, `lg:sr-only` | Custom markup. The `h2` style matches the existing section headings, or `text-sm font-bold uppercase tracking-widest`. Whether to hide it at lg depends on whether the home page has the sticky left nav (separate decision). |
| Mobile sticky heading bar | `sticky top-0 z-20 -mx-6 w-screen px-6 py-5 bg-…/75 backdrop-blur` | Custom Tailwind. Background `bg-background/75` + `backdrop-blur`. Ensure `z-index` stays under the site header if it is also sticky. |
| `ol.group/list` + rows | Tailwind v3 `group/list`, `group-hover/list:opacity-50`, `hover:!opacity-100` | Custom, same utilities in Tailwind v4: `group/list`, `lg:group-hover/list:opacity-50`, `lg:hover:opacity-100!` (v4 puts `!` at the end). Consider adding `lg:group-focus-within/list:opacity-50` + `lg:focus-within:opacity-100!` for keyboard parity, and fixing the gap quirk by dimming only via `:has(> li > div:hover)`: `lg:[&:has(>li>div:hover)>li>div:not(:hover)]:opacity-50`. |
| Hover card background | absolutely positioned `div`, `-inset-x-6 -inset-y-4 rounded-md`, bg + inset top highlight + `drop-shadow-lg` | Custom `div` (not shadcn `Card`, which carries border/padding/layout). Use `lg:group-hover:bg-card/50` (or `bg-muted/50`), `lg:group-hover:shadow-[inset_0_1px_0_0_var(--border)]`, `lg:group-hover:drop-shadow-lg`, `rounded-md`, `transition motion-reduce:transition-none`. |
| Date column | `header.sm:col-span-2` 12px/600/uppercase/0.025em, `aria-label` with words | Custom `<header>` or `<p>`, colour `text-muted-foreground`. Better semantics: two `<time dateTime>` elements inside. |
| Title · company link + stretched overlay | `a.group/link` containing `span.absolute -inset-x-6 -inset-y-4 lg:block` | Custom `<a>`. Use lucide `ArrowUpRight` (`size-4 ml-1 translate-y-px group-hover/link:translate-x-1 group-hover/link:-translate-y-1 group-focus-visible/link:…`). Hover colour `hover:text-primary` / accent. Add a visible focus ring (`focus-visible:ring-[3px] ring-ring/50`, matching shadcn) on the overlay span via `group-focus-visible/link:ring…`, so the whole card shows focus. |
| Previous titles | `div.text-muted` `aria-hidden` | Custom. Recommend **not** `aria-hidden`, e.g. a visually-muted `<p>` or sr-friendly "Previously: …". |
| Description | `p.mt-2.text-sm.leading-normal` | Plain `<p>`, `text-muted-foreground`. |
| Related links | `a.relative` + 12px link icon | Custom `<a>` + lucide `Link` `size-3 mr-1`. Must be `relative` (or `z-20`) to sit above the stretched overlay. |
| Tech pills | `div.rounded-full px-3 py-1 text-xs/5 font-medium` teal-on-teal/10 | **Installed `Badge`** (`front-end/src/shared/components/ui/badge.tsx`, already `rounded-full text-xs font-medium`). Override padding/line-height to match (`px-3 py-1 leading-5`) and colour via accent tokens: `bg-[color-mix(in_oklab,var(--adw-accent-color)_10%,transparent)] text-[var(--adw-accent-color)]` or a new `variant`. Render inside `ul[aria-label="Technologies used"] > li`. |
| "View Full Résumé" | text link, semibold 16px, arrow | Custom `<a>` reusing the same arrow pattern. shadcn `Button variant="link"` adds an underline-on-hover and padding that differ from the reference, so plain `<a>` is closer. |
| Reveal on scroll | Framer-Motion-style inline opacity/blur/translateY | Not required. If wanted, use a small IntersectionObserver hook + CSS classes (no new dependency; do **not** add `motion` without approval). Respect `prefers-reduced-motion`. |
| Timeline rail (PROPOSAL) | — | Custom `aria-hidden` elements per the proposal above. No shadcn component exists for it. |

No extra shadcn component is required. `Badge` is the only direct reuse; `Card`, `Separator` and `Button` would each add styling that has to be overridden, so custom Tailwind is simpler for the rest.
