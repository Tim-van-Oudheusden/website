# Warm Dark Theme: Choosing a Beige/Brown-Tinted Dark Palette (#748)

Date: 2026-10-11

Legend: **[SRC]** = stated by a primary source (linked); **[COMPUTED]** = calculated with the WCAG formula by a script run for this note; **[INFERENCE]** = my reasoning, not stated by a source.

## 1. Problem

Dark mode used libadwaita's dark UI colours: a cold grey window `#222226`, cards `#2e2e32`, a light-blue accent `#81d0ff`, and the purple-grey HIG darks (`#3d3846`, `#5e5c64`) in places such as the blockquote. On top of that sat a warm page `#1c1a17` and saturated brown wells `#63452c` (#641). The result mixed cold blue-grey with chocolate brown. The black call-to-action buttons, the floating-nav indicator and the black logo plate stayed black, so on the dark page they almost disappeared (black vs the old well: 2.42:1; black logo vs the old page: 1.21:1) [COMPUTED].

The GNOME HIG palette "is intended for use in app icons and illustrations" ([SRC], quoted in `research/adwaita_dark_well_contrast.md` §2), so it was never a web UI system. #748 drops it as a constraint. Goal: one established dark scheme with a beige/brown tint, so dark mode shares the light theme's warm character, at WCAG 2.2 AA.

## 2. Sources

### Flexoki (Steph Ango): <https://stephango.com/flexoki>, values in <https://github.com/kepano/flexoki/blob/main/css/flexoki.css>

- [SRC] "An inky color scheme for prose and code … designed for reading and writing on digital screens. It is inspired by analog inks and warm shades of paper." MIT licence.
- [SRC] "Flexoki uses warm monochromatic base values that blend the black value with the paper value." Dark-theme roles: `bg` black `#100F0F`, `bg-2` base-950 `#1C1B1A`, `ui` base-900 `#282726`, `ui-2` base-850 `#343331`, `ui-3` base-800 `#403E3C`, `tx-3` base-700 `#575653`, `tx-2` base-500 `#878580`, `tx` base-200 `#CECDC3`. Paper is `#FFFCF0`, base-50 `#F2F0E5`.
- [SRC] Accents come in ramps from 50 to 950; "Light themes should use 600 … dark themes should use 400." Accents "cannot be derived using opacity because this desaturates the pigment effect."
- [SRC] Colours are derived in Oklab "to maintain those perceptual relationships at the light and dark ends of the spectrum". Solarized was an inspiration.
- [SRC] Syntax roles (from `vim/flexoki_dark.vim` in the repo): keyword and type green, function orange, string cyan, number purple, constant yellow, identifier blue, preprocessor/boolean magenta, comment `tx-3`.

### Gruvbox (morhetz): <https://github.com/morhetz/gruvbox>, values in `colors/gruvbox.vim`

- [SRC] "Designed as a bright theme with pastel 'retro groove' colors … The main focus … is to keep colors easily distinguishable, contrast enough and still pleasant for the eyes."
- [SRC] Dark backgrounds: `dark0_hard #1d2021`, `dark0 #282828` (default), `dark0_soft #32302f`, `dark1 #3c3836`, `dark2 #504945`. Foreground `light1 #ebdbb2`, `light4 #a89984`. Bright accents: orange `#fe8019`, red `#fb4934`, yellow `#fabd2f`, green `#b8bb26`, blue `#83a598`, purple `#d3869b`, aqua `#8ec07c`.

### Zenburn (Jani Nurminen): <https://github.com/jnurmine/Zenburn>

- [SRC] "Zenburn is a low-contrast color scheme for Vim. It's easy for your eyes and designed to keep you in the zone for long programming sessions."
- [SRC] `Normal` is `#dcdccc` on `#3f3f3f`; comments `#7f9f7f`; keywords `#f0dfaf`; strings `#cc9393`.

### Solarized (Ethan Schoonover): <https://ethanschoonover.com/solarized/>

- [SRC] Dark background `base03 #002b36`, `base02 #073642`; body text `base0 #839496`, `base1 #93a1a1`; light background `base3 #fdf6e3`.

### Material Design dark theme guidance

- <https://m2.material.io/design/color/dark-theme.html> [SRC]: "Dark surfaces and 100% white body text have a contrast level of at least 15.8:1"; "At higher levels of elevation, components express depth by displaying lighter surface colors"; "Use dark grey – rather than black – to express elevation and space"; "Apply limited color accents in dark theme UIs, so the majority of space is dedicated to dark surfaces". (Quotes from the page's search snippets; the page renders client-side.)
- <https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md> [SRC]: "Shadows are less effective in an app using a dark theme … Material surfaces become lighter and more colorful at higher elevations."

### WCAG 2.2

- [SRC] 1.4.3: 4.5:1 for text, 3:1 for large text (≥ 24px, or ≥ 18.5px bold). Thresholds are not rounded ("4.499:1 would not meet the 4.5:1 threshold"). <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- [SRC] 1.4.11: 3:1 for UI component boundaries (when they are the only cue), states and focus indicators. <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>
- [SRC] Ratio `(L1 + 0.05) / (L2 + 0.05)`, relative luminance per <https://www.w3.org/TR/WCAG22/#dfn-relative-luminance>.

## 3. Candidates compared [COMPUTED]

Method: WCAG 2.x formula, unrounded for pass/fail, shown to 2 dp. "Well" is the next surface step up. Accent is each scheme's own orange/warm accent at its documented dark tone.

| Scheme | Page (HSL) | fg / page | fg / well | muted / page | muted / well | accent / page | accent / well | well / page |
|---|---|---|---|---|---|---|---|---|
| **Flexoki** (`#1c1b1a`, `#282726`, tx `#cecdc3`, tx-2 `#878580`, orange-400 `#da702c`) | H30 S4% L11% | 10.77 | 9.33 | 4.67 | **4.04 FAIL** | 5.19 | **4.498 FAIL** | 1.15 |
| Gruvbox medium (`#282828`, `#3c3836`, `#ebdbb2`, `#a89984`, `#fe8019`) | H0 S0% L16% | 10.75 | 8.45 | 5.30 | **4.17 FAIL** | 5.84 | 4.59 | 1.27 |
| Gruvbox soft (`#32302f`, `#3c3836`) | H20 S3% L19% | 9.57 | 8.45 | 4.72 | **4.17 FAIL** | 5.20 | 4.59 | 1.13 |
| Zenburn (`#3f3f3f`, `#4f4f4f`, `#dcdccc`, `#7f9f7f`, `#f0dfaf`) | H0 S0% L25% | 7.60 | 5.91 | **3.59 FAIL** | **2.80 FAIL** | 7.96 | 6.19 | 1.29 |
| Solarized dark (`#002b36`, `#073642`, `#839496`, `#586e75`, `#cb4b16`) | H192 S100% L11% | 4.75 | **4.11 FAIL** | **2.79 FAIL** | **2.42 FAIL** | **3.26 FAIL** | **2.82 FAIL** | 1.15 |
| Old site (`#1c1a17`, well `#63452c`, white, `#c0bfbc`, `#81d0ff`) | H36 S10% L10% | 17.36 | 8.68 | 9.44 | 4.72 | 10.25 | 5.13 | 2.00 |

Other numbers used below:

- The light page `#f3efe5` against Flexoki base-50 `#f2f0e5`: 1.004:1, i.e. the same colour (HSL H43 S37% L93% vs H51 S33% L92%).
- Flexoki 400 accents on `#1c1b1a`: red 3.97, orange 5.19, yellow 7.26, green 5.50, cyan 6.02, blue 4.37, purple 4.85, magenta 4.62. On `#282726`: red 3.44, orange 4.498, blue 3.79, purple 4.20, magenta 4.00.
- Flexoki `tx-3` `#575653` on `#1c1b1a`: 2.34, so it cannot carry text (Flexoki uses it for faint text and comments).
- Material's `#121212` with white text: 18.73.

## 4. Decision: Flexoki dark, adapted for AA

**Chosen: Flexoki.** Reasons:

1. It is the same idea as the light theme. Flexoki is ink on paper, and the site's light page already is Flexoki base-50 (1.004:1). Dark mode becomes the "warm black" side of the light theme rather than a separate system. [COMPUTED for the ratio, INFERENCE for the rest]
2. Its base ramp is warm on every step (H30–40, S3–4%), so every neutral (page, wells, cards, borders, muted text) carries the tint. It is slight, but it applies everywhere, including the places where the old theme was cold blue-grey. [COMPUTED HSL]
3. It is documented, versioned and MIT licensed, with a full 50–950 ramp per hue. That makes picking an AA-safe tone a lookup, not an invention. [SRC]
4. It fits Material's guidance: dark grey not black, lighter surfaces for elevation, few accents. [SRC + INFERENCE]

**Adaptations, all inside Flexoki's own ramps:**

- Page `bg-2` `#1c1b1a` (not `bg` `#100f0f`): Material advises dark grey over black, and it keeps the page close to the old `#1c1a17`. Wells `ui` `#282726` sit one step up (1.15:1, like white wells on the beige page in light mode at 1.15:1). Raised surfaces inside wells and hover fills use `ui-2` `#343331`.
- Body text `tx` `#cecdc3`; headings, the inverted fills and the logo plate use paper `#fffcf0`.
- Muted text is base-300 `#b7b5ac` (7.26 on the well) instead of `tx-2` `#878580`, which fails on the well (4.04). Secondary text that used Adwaita Light 5 maps to base-400 `#9f9d96` (5.49 on the well, 4.65 on raised cards).
- Accent: Flexoki's 400 tones fail on the wells (orange 4.498, red 3.44, blue 3.79), so text and focus rings use orange-200 `#f9ae77` (8.06 on the well) and fills use orange-300 `#ec8b49` with black text (7.62). This follows Material's advice to use lighter, less saturated tones on dark surfaces. Orange instead of blue: it is Flexoki's warm accent and removes the last cold colour from dark mode. [INFERENCE: a design call; light mode keeps its blue]
- Status colours: red-300 `#e8705f` (destructive/error), green-300 `#a0af54`, yellow-300 `#dfb431` as fills with black text; 200 tones for standalone text.
- Syntax highlighting: Flexoki's syntax roles at the 200 tones, which all clear 4.5:1 on the code block `#343331` (lowest 6.43); comments use base-400 `#9f9d96` (4.65).
- The old neutral ramp (`--adw-light-1..5`, `--adw-dark-1..5`) is overridden in `.dark` with the Flexoki base values of the same lightness, so every component class that used a GNOME grey (for example the purple-grey blockquote `#3d3846`) becomes warm without touching the component.

## 5. Why the alternatives lost

- **Gruvbox:** the most "brown" of the set (beige text `#ebdbb2`, brown `dark1`–`dark2`), but its default background `#282828` is pure grey (S0%) and only the soft/hard variants tint it. Its bright accents (`#fe8019`, `#fb4934`, `#b8bb26`) are saturated "retro groove" colours meant for code; on large web surfaces they would be louder than the calm light theme. Its muted `light4` fails on the next surface (4.17). It has no light-theme counterpart that matches the site's paper beige. [SRC values, COMPUTED ratios, INFERENCE on fit]
- **Zenburn:** low contrast by design ([SRC]); its grey `#3f3f3f` is neutral (S0%) and its comment green fails AA even on the page (3.59). It is an editor scheme with no surface or UI ramp. [COMPUTED]
- **Solarized dark:** a blue-teal background (H192), the opposite of warm, and its body text fails AA on the next surface (4.11). Kept here because Flexoki names it as its inspiration. [COMPUTED]
- **Material baseline dark (`#121212`):** guidance, not a palette; it is neutral grey. Its rules (dark grey, lighter elevation, desaturated accents) are applied on top of Flexoki instead. [INFERENCE]
- **Keeping brown wells (`#63452c`)** with new neutrals: the wells were the main reason the old theme looked busy. Large saturated brown panels next to grey cards and a blue accent did not read as one scheme. [INFERENCE, from the before screenshots in the PR]

## 6. Final dark tokens and contrast [COMPUTED]

Surfaces: page `#1c1b1a`, well `#282726`, raised `#343331`, blockquote `#403e3c`, inverted paper `#fffcf0`.

| Role | Token | Old → new | On page | On well | On raised |
|---|---|---|---|---|---|
| Body text | `--foreground`, `--adw-window-fg-color` | `#ffffff` → `#cecdc3` | 10.77 | 9.33 | 7.90 |
| Headings, `dark:text-(--adw-light-1)` | `--adw-light-1` | `#ffffff` → `#fffcf0` | 16.73 | 14.51 | 12.28 |
| Muted text, TOC inactive | `--muted-foreground`, `--adw-light-4` | `#c0bfbc` → `#b7b5ac` | 8.37 | 7.26 | 6.14 |
| Secondary text | `--adw-light-5` | `#9a9996` → `#9f9d96` | 6.34 | 5.49 | 4.65 |
| `white/80` copy (unchanged class) | — | — | 11.29 | 10.06 | 8.68 |
| `white/60` meta (unchanged class) | — | — | 6.89 | 6.34 | 5.64 |
| Accent text, focus ring | `--adw-accent-color`, `--ring` | `#81d0ff` → `#f9ae77` | 9.29 | 8.06 | 6.82 |
| Primary as text (`text-primary`) | `--primary` | `#3584e4` → `#ec8b49` | 6.84 | 5.93 | 5.02 |
| Primary fill + text | `--primary` / `--primary-foreground` | white on `#3584e4` 3.77 → `#100f0f` on `#ec8b49` | 7.62 | | |
| Error text (`text-destructive`) | `--destructive` | `#c01c28` → `#e8705f` | 5.66 | 4.91 | 4.16 (not used there) |
| Destructive button (`dark:bg-destructive/60` + white) | `--destructive` | 10.17 → | 6.06 | 5.64 | 5.25 |
| Standalone error/success/warning text | `--adw-*-color` | → `#f89a8a` / `#bec97e` / `#eccb60` | 8.17 / 9.70 / 10.87 | 7.09 / 8.41 / 9.43 | 6.00 / 7.12 / 7.98 |
| Status fills + `#100f0f` | `--adw-{success,warning,error}-bg-color` | → `#a0af54` / `#dfb431` / `#e8705f` | 7.98 / 9.76 / 6.30 | | |
| Inverted buttons, tag badges, nav indicator text | `#100f0f` on `#fffcf0` | black on white 21.00 → | 18.62 (15.46 on the 90% hover over the well) | | |
| Blockquote text | `--adw-light-2` on `--adw-dark-3` | 10.41 → | 9.31 | | |
| Code (`hljs` tones on `#343331`) | — | github-dark → Flexoki 200s | | | 6.43–7.98; comments 4.65 |

Non-text (1.4.11, ≥ 3:1):

| Pair | Old | New |
|---|---|---|
| Focus ring vs page / well / raised | 10.25 / 5.13 / 7.98 | 9.29 / 8.06 / 6.82 |
| Hero CTA and featured-project button fill vs well | 2.42 (black on `#63452c`) | 14.51 (paper on `#282726`) |
| Floating-nav active indicator vs well | 2.42 | 14.51 |
| Logo plate vs page | 1.21 | 16.73 |

Not AA-relevant (decorative or not the only cue, per 1.4.11): well vs page 1.15, raised vs well 1.18, borders `#403e3c` vs page 1.62 / well 1.40, floating-nav border `#575653` vs page 2.34.

Script: throwaway TypeScript/Python with the WCAG formula, not kept in the repo.

## 7. Outcome (#748)

- `front-end/src/index.css`: `.dark` retuned as in §6; the neutral ramp is overridden with Flexoki base values; dark prose (`prose-invert`) points at the tokens instead of Tailwind's cool greys; highlight.js dark colours use Flexoki roles.
- The logo is an inline SVG (`SiteLogo`) whose plate uses `currentColor`: black in light mode, paper in dark mode, lettering inverted.
- The hero CTA, the featured-project button and the floating-nav indicator invert to paper with dark text in dark mode, like the tag badges already did.
- `BRANDING.md` "Colours" describes the light and dark palettes and drops the Adwaita requirement.
- The e2e spec `e2e/home-section-surfaces.e2e.ts` now also checks that the hero CTA and the floating-nav indicator fill stand out from the dark well at 3:1 and that the active nav label is readable on the indicator.
