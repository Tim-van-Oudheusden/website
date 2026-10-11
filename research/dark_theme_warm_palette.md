# Warm Dark Theme: Choosing a Palette (#748)

Date: 2026-10-11

Legend: **[SRC]** = stated by a primary source (linked); **[COMPUTED]** = calculated with the WCAG 2.2 contrast formula by a script run for this note; **[INFERENCE]** = my reasoning, not stated by a source.

## 1. Problem

Light mode is a warm beige page (`#f3efe5`) with white wells. Dark mode did not share that character. Its window and cards were libadwaita's neutral blue-grey (`#222226`, `#1d1d20`), its wells were GNOME HIG Brown 5 (`#63452c`), and its accents were libadwaita's cool `#81d0ff`. Several pairs were below WCAG AA: muted text on the well (3.05:1), white on the blue primary fill (3.77:1), white on the green success fill (3.25:1), and translucent input borders (≈1.1:1) [COMPUTED, table in §4].

Adwaita stops being a colour constraint. The GNOME HIG palette "is intended for use in app icons and illustrations" [SRC: <https://developer.gnome.org/hig/reference/palette.html>, quoted in `adwaita_dark_well_contrast.md` §2], not for web UI pairings.

The goal: an established dark scheme with a beige/brown tint (a slight one is fine), retuned onto every dark token, at WCAG 2.2 AA.

## 2. Requirements

- [SRC] WCAG 2.2 SC 1.4.3: 4.5:1 for body text, 3:1 for large text (<https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>). SC 1.4.11: 3:1 for UI component boundaries and focus indicators (<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>).
- [SRC] Material Design's dark theme guidance (<https://m2.material.io/design/color/dark-theme.html>): use a dark grey rather than pure black as the base (its reference surface is `#121212`). Show elevation by making higher surfaces lighter. Desaturate primary colours so they reach AA (4.5:1 for body text) "at all elevation levels". Keep accents sparse on large dark surfaces.
- [INFERENCE] From the site: the tokens are read through `--adw-*` neutrals that components already switch to in dark mode (`dark:text-(--adw-light-1)`, `dark:text-(--adw-light-5)`, `dark:bg-[var(--adw-dark-3)]` …). A scheme with a full ordered neutral scale can be dropped onto those ten slots without touching components.

## 3. Candidates

### Flexoki: <https://stephango.com/flexoki>, <https://github.com/kepano/flexoki>

- [SRC] By Steph Ango, MIT licence (attribution and a link to stephango.com/flexoki requested for ports). Flexoki is "inspired by analog inks and warm shades of paper", with colours "calibrated for legibility and perceptual balance across devices".
- [SRC] Base scale: black `#100F0F`, 950 `#1C1B1A`, 900 `#282726`, 850 `#343331`, 800 `#403E3C`, 700 `#575653`, 600 `#6F6E69`, 500 `#878580`, 400 `#9F9D96`, 300 `#B7B5AC`, 200 `#CECDC3`, 150 `#DAD8CE`, 100 `#E6E4D9`, 50 `#F2F0E5`, paper `#FFFCF0`. Every step has red > green > blue, so the greys lean warm.
- [SRC] Dark roles: `bg` black, `bg-2` 950, `ui` 900, `ui-2` 850, `ui-3` 800, `tx-3` 700, `tx-2` 500, `tx` 200. Dark themes use the 400 accents, light themes the 600 accents. An extended 50–950 scale exists for every accent (from `css/flexoki.css` in the repository).
- [COMPUTED] `tx` on `bg` 11.98:1. `tx-2` on `bg` 5.19:1, but on `bg-2` only 4.67:1. Blue-400 on `bg` 4.86:1, but on `ui` only 3.79:1. Red-400 on `bg-2` 3.97:1. So Flexoki's own 400 accents and `tx-2` are not AA on every raised surface. The extended scale has lighter 300 shades that are.

### Gruvbox (dark): <https://github.com/morhetz/gruvbox>

- [SRC] Goal: "keep colors easily distinguishable, contrast enough and still pleasant for the eyes". Values from `colors/gruvbox.vim`: bg0 `#282828`, bg0_h `#1d2021`, bg1 `#3c3836`, fg1 `#ebdbb2`, fg4 `#a89984`, gray `#928374`, bright accents (`#fb4934`, `#b8bb26`, `#fabd2f`, `#83a598`, `#d3869b`, `#8ec07c`, `#fe8019`).
- [COMPUTED] fg1 on bg0 10.75:1. fg4 on bg0 5.30:1, but on bg1 4.17:1. Gray on bg0 4.02:1.
- [INFERENCE] The warmth sits in the cream foreground (`#ebdbb2`), not in the backgrounds. bg0 `#282828` is a neutral grey, and bg0_h `#1d2021` leans slightly green-blue. Its accents are saturated retro tones, which go against Material's advice to desaturate on dark surfaces and would clash with the light theme's blue. It reads as a terminal theme more than as paper.

### Zenburn: <https://github.com/jnurmine/Zenburn>

- [SRC] Normal fg `#dcdccc` on bg `#3f3f3f`. Comment `#7f9f7f`, statement `#e3ceab`.
- [COMPUTED] fg on bg 7.60:1, comment 3.59:1.
- [INFERENCE] A low-contrast, mid-grey (`#3f3f3f`) syntax scheme with no surface scale. Too light a page for a reading site, and secondary text fails AA.

### Material Design dark baseline

- [SRC] `#121212` base, with elevation shown as lighter overlays and desaturated accents.
- [INFERENCE] It's guidance, not a palette. It's neutral, so it has no beige/brown tint. Its rules are still used here to check the chosen scheme.

## 4. Decision: Flexoki, with AA-driven role choices

[INFERENCE] Flexoki wins:
1. It is the only candidate whose whole neutral scale (backgrounds included) carries a warm, paper-and-ink undertone. That makes dark mode a sibling of the beige light theme.
2. It has a complete, ordered 15-step scale, which maps one-to-one onto the site's `--adw-light-1..5` and `--adw-dark-1..5` slots.
3. Its base is a near-black (`#100F0F`), not pure black, and higher surfaces get lighter, which is Material's model.
4. It has an extended accent scale, so any accent that misses AA at Flexoki's default 400 step can move one step lighter (300) within the same hue.

Gruvbox lost on neutral backgrounds and saturated accents, Zenburn on a mid-grey page and failing secondary text, Material on having no tint.

Role choices, with deviations from Flexoki's defaults:
- Page and window: `black` `#100f0f`. Wells and cards: `bg-2` `#1c1b1a`. Raised controls (popovers, sidebar, CTA circles): `ui` `#282726`. Hover and code blocks: `ui-2` `#343331`. Borders: `ui-3` `#403e3c`.
- Body text: `tx` `#cecdc3`. Headings and strong text (`--adw-light-1`): base-100 `#e6e4d9`.
- Muted text: base-400 `#9f9d96` instead of `tx-2` (500), because 500 is 4.67:1 on wells but 4.04:1 on raised surfaces [COMPUTED]. 400 keeps ≥ 6.3:1 on page, wells and cards.
- Links, accents and focus ring: blue-300 `#66a0c8` instead of blue-400, which is only 3.79:1 on raised surfaces [COMPUTED].
- Status text uses the 300 shades (red `#e8705f`, green `#a0af54`, yellow `#dfb431`). Filled controls use 600/700 shades with paper text: primary blue-600 `#205ea6`, destructive red-600 `#af3029`, success green-700 `#536907` (green-600 with paper is only 4.39:1). Warning is yellow-400 `#d0a215` with black text.
- Input boundaries: base-600 `#6f6e69`, ≥ 3.37:1 on page, wells and cards. Before, they were translucent at about 1.1:1.
- Inverted fills (logo, black call-to-action buttons, floating-nav indicator, tag badges): base-100 `#e6e4d9` with black `#100f0f` (15.00:1). These were black on a dark page in dark mode before.
- Charts: Flexoki 400 accents.
- [COMPUTED] Page vs well is 1.11:1 and well vs raised is 1.15:1. That matches light mode's beige page vs white well (1.15:1). Wells are surfaces, not UI controls, so SC 1.4.11 does not apply to them (`adwaita_dark_well_contrast.md` §2).

### Old → new dark tokens [COMPUTED]

Contrast is the WCAG ratio of the token against the named surface, with translucent colours composited first. Thresholds: 4.5 for text, 3 for focus ring and input boundary. `--border` is decorative.

| Token | Role | Old | New | Old contrast | New contrast |
|---|---|---|---|---|---|
| `--adw-page-beige-bg` | page | `#1c1a17` | `#100f0f` | (surface) | (surface) |
| `--background` | window / body | `#222226` | `#100f0f` | (surface) | (surface) |
| `--site-section-well-bg` | section wells | `#63452c` | `#1c1b1a` | (surface) | (surface) |
| `--card` | cards | `#1d1d20` | `#1c1b1a` | (surface) | (surface) |
| `--popover` | popovers, raised controls | `#2e2e32` | `#282726` | (surface) | (surface) |
| `--muted` | code blocks, hover | `#28282c` | `#343331` | (surface) | (surface) |
| `--foreground` | body text | `#ffffff` | `#cecdc3` | page 15.85, well 8.68, card 16.82 | page 11.98, well 10.77, card 10.77 |
| `--adw-light-1` | headings, strong text | `#ffffff` | `#e6e4d9` | page 15.85, well 8.68, card 16.82 | page 15.00, well 13.48, card 13.48 |
| `--muted-foreground` | muted text | `#c0bfbc` | `#9f9d96` | page 8.62, well 4.72, card 9.14 | page 7.05, well 6.34, card 6.34 |
| `--adw-light-5` | secondary text (home) | `#9a9996` | `#9f9d96` | page 5.56, well 3.05, card 5.90 | page 7.05, well 6.34, card 6.34 |
| `--adw-toc-inactive` | inactive TOC entries | `#c0bfbc` | `#b7b5ac` | well 4.72 | well 8.37 |
| `--adw-accent-color` | links, accents | `#81d0ff` | `#66a0c8` | page 9.36, well 5.13, card 9.93 | page 6.77, well 6.08, card 6.08 |
| `--ring` | focus ring (3:1) | `#81d0ff` | `#66a0c8` | page 9.36, well 5.13, card 9.93 | page 6.77, well 6.08, card 6.08 |
| `--border` | borders (decorative) | `rgb(0 0 6 / 36%)` | `#403e3c` | card 1.10 | card 1.62 |
| `--input` | input boundary (3:1) | `rgb(0 0 6 / 36%)` | `#6f6e69` | page 1.14, card 1.10 | page 3.75, card 3.37 |
| `--primary-foreground` | on --primary | `#ffffff` | `#fffcf0` | fill 3.77 | fill 6.36 |
| `--destructive-foreground` | on --destructive | `#ffffff` | `#fffcf0` | fill 6.11 | fill 6.23 |
| `--success-foreground` | on --success | `#ffffff` | `#fffcf0` | fill 3.25 | fill 6.03 |
| `--warning-foreground` | on --warning | `rgb(0 0 0 / 80%)` | `#100f0f` | fill 6.12 | fill 8.08 |
| `--adw-destructive-color` | error text | `#ff938c` | `#e8705f` | page 7.40, well 4.05, card 7.85 | page 6.30, well 5.66, card 5.66 |
| `--adw-success-color` | success text | `#78e9ab` | `#a0af54` | page 10.60, well 5.81, card 11.24 | page 7.98, well 7.17, card 7.17 |
| `--adw-warning-color` | warning text | `#ffc252` | `#dfb431` | page 9.88, well 5.41, card 10.48 | page 9.76, well 8.77, card 8.77 |
| `--adw-dark-5` | text on inverted fills | `#000000` | `#100f0f` | fill 21.00 | fill 15.00 |

`test/front-end/src/shared/styles/dark-theme-palette.test.ts` resolves the `.dark` tokens from `index.css` and checks every text/UI pair above (plus popover, secondary, muted and the blockquote fill) at these thresholds. It also checks that every dark surface is warm (red > blue).

## 5. Not changed

- Light-mode tokens. The only `:root` edit is `--adw-beige-dark`, which only `.dark` reads.
- The `--adw-*` custom-property names. Renaming them is a mechanical refactor that would bury the colour diff, so it's left for a follow-up.
- The highlight.js dark token colours (GitHub dark). They sit on `--muted` (`#343331`) code blocks and are not theme tokens. [INFERENCE] Flexoki ships its own syntax mapping if a later change wants it.
- Hard-coded `white/80`, `white/60` and `text-white` classes in some components. They are composited over the warm surfaces, which tints them warm. Making them tokens is component work outside this palette change.
