# Adwaita Dark-Mode "Well" Contrast (WCAG AA)

Date: 2026-10-07

Legend: **[SRC]** = stated by a primary source (linked); **[COMPUTED]** = calculated with the WCAG formula by a script run for this note; **[INFERENCE]** = my reasoning, not stated by a source.

## 1. Problem

In `.dark` (`front-end/src/index.css:256`) `--site-section-well-bg` is `#857555` on page `--adw-beige-dark: #1c1a17`. Text on the well is `--adw-light-1` (#ffffff) headings, `dark:text-white/80` body copy, `--adw-light-5` (#9a9996) secondary text, `white/60` meta text, and `--adw-accent-color` (#81d0ff) accents. `#857555` is not an Adwaita colour: it is not in the HIG palette or the libadwaita tables below [COMPUTED: grep of the cited tables].

## 2. Sources and what they say

### GNOME HIG palette — <https://developer.gnome.org/hig/reference/palette.html>

- [SRC] The palette "is intended for use in app icons and illustrations." It is not specified as a UI text/background pairing system. The UI colour system is libadwaita's (next section).
- [SRC] Brown family: Brown 1 `#cdab8f`, Brown 2 `#b5835a`, Brown 3 `#986a44`, Brown 4 `#865e3c`, Brown 5 `#63452c`.
- [SRC] Neutrals: Light 1 `#ffffff`, Light 2 `#f6f5f4`, Light 3 `#deddda`, Light 4 `#c0bfbc`, Light 5 `#9a9996`, Dark 1 `#77767b`, Dark 2 `#5e5c64`, Dark 3 `#3d3846`, Dark 4 `#241f31`, Dark 5 `#000000`.
- [SRC] Other warm swatches: Orange 5 `#c64600`, Yellow 5 `#e5a50a`. Neither is a muted beige/khaki. No palette swatch is close to `#857555`.

### libadwaita CSS variables — <https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/css-variables.html>

- [SRC] `*-bg-color` / `*-fg-color` "are always meant to be used together as the background and foreground color." Apps may re-declare them.
- [SRC] Standalone colours (`--accent-color`) "provide better contrast when used as foreground colors on top of a neutral background", are "lighter than the background for the dark style", and are derived with `oklab(from var(--accent-bg-color) var(--standalone-color-oklab))`, where `--standalone-color-oklab` is `min(l, 0.5) a b` (light) and `max(l, 0.85) a b` (dark). When overriding background colours for a widget, the standalone colour must be overridden too.
- [SRC] Dark blue standalone accent is `#81d0ff` (Light `#0461be`). This is the value the site uses. The docs describe it as being for a *neutral* background.
- [SRC] Dark UI colours: window `#222226`, view `#1d1d20`, headerbar/sidebar `#2e2e32`; every dark `*-fg-color` is `#ffffff` (not 80%). Light-style fg is `rgb(0 0 6 / 80%)`. So `white/80` on dark is a site choice, not an Adwaita one.
- [SRC] Dark `--card-bg-color` is `rgb(255 255 255 / 8%)` with `--card-fg-color` `#ffffff`. Libadwaita's own raised surface in dark is a translucent white overlay on the window colour, not a coloured surface.
- [SRC] Opacity variables: `--dim-opacity` 55% (regular) / 90% (high contrast), `--border-opacity` 15% / 50%. These are for dimmed secondary text and borders; the 90% high-contrast value shows libadwaita itself treats 55% as a non-high-contrast value. [INFERENCE] 55% is not designed to meet WCAG AA.
- Style classes: <https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/style-classes.html>: `.accent` applies the standalone accent colour to labels.

**Conclusion from the Adwaita sources:** they contain no guidance for a brown/beige surface carrying white text. The only Adwaita-native way to get a contrast-guaranteed foreground is the bg/fg pairing, plus deriving the standalone colour for the actual background. The standalone formula already gives dark lightness ≥ 0.85, so it cannot be made lighter. On a mid-tone brown the only lever is a darker background. [INFERENCE]

### WCAG 2.2

- [SRC] 1.4.3 Contrast (Minimum): 4.5:1 for text, 3:1 for large-scale text. 18pt, or 14pt bold, is large; "14pt and 18pt are equivalent to approximately 18.5px and 24px" (<https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>). Ratios are thresholds and must not be rounded: "4.499:1 would not meet the 4.5:1 threshold". Brand guidelines give no exemption for non-logo text. The exemption for inactive components applies only to disabled controls.
- [SRC] 1.4.11 Non-text Contrast: 3:1 against adjacent colours for UI components and states (including focus indication) and for graphics required to understand content (<https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>). An external focus indicator must contrast with the background the component sits on (Fig. 9/10). A visual boundary for a control is only required when nothing else identifies it.
- [SRC] Per 1.4.11, the criterion covers UI components and graphical objects. It does not require a background surface to contrast with the page behind it. A card/well boundary is only an issue if the well itself is the sole cue identifying a control. [INFERENCE] The well-vs-page ratio is a design concern, not an SC 1.4.11 failure, when the content inside the well is readable.
- Definitions: contrast ratio = (L1 + 0.05) / (L2 + 0.05); relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B with sRGB linearisation: <https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio>, <https://www.w3.org/TR/WCAG22/#dfn-relative-luminance>. Semi-transparent text is composited over its background first. [INFERENCE: standard practice, sources define ratio on the resulting rendered colours]

## 3. Computed contrast ratios [COMPUTED]

Method: Python, WCAG 2.x formula, text with alpha composited over the well (rounded to 8-bit), ratio unrounded in the check. Pass threshold 4.5 for text. Ratios shown to 2 dp, but pass/fail uses the exact values. Page bg = `#1c1a17`.

### Current well `#857555` (dark)

| Foreground | Ratio | AA text (4.5) |
|---|---|---|
| `#ffffff` (--adw-light-1) | 4.494 (below 4.5) | FAIL by a hair |
| white/80 (`dark:text-white/80`) | 3.52 | FAIL |
| white/70 | 3.10 | FAIL |
| white/60 (home-recent-posts meta) | 2.70 | FAIL |
| `#c0bfbc` (Light 4, = `--muted-foreground` dark) | 2.44 | FAIL |
| `#9a9996` (Light 5, about-me/experience secondary) | 1.58 | FAIL |
| `#8f877b` (`--adw-toc-inactive` dark) | 1.27 | FAIL |
| `#81d0ff` accent | 2.65 | FAIL (also < 3:1, so fails UI/focus 3:1 too) |
| black `#000` | 4.67 | pass (not used) |
| well vs page `#1c1a17` | 3.86 | n/a (not required) |

Large-scale text (≥ 24px, or ≥ 18.5px bold) only needs 3:1: white/80 (3.52) and white (4.49) would pass at that size. Body copy and 12–16px labels do not qualify.

### Candidate wells (dark)

| Well | white | white/80 | white/70 | white/60 | Light 4 `#c0bfbc` | Light 5 `#9a9996` | accent `#81d0ff` | well vs page |
|---|---|---|---|---|---|---|---|---|
| `#857555` (current) | 4.49 | 3.52 | 3.10 | 2.70 | 2.44 | 1.58 | 2.65 | 3.86 |
| Brown 3 `#986a44` | 4.69 | 3.63 | 3.17 | 2.75 | 2.55 | 1.65 | 2.77 | 3.70 |
| Brown 4 `#865e3c` | 5.71 | 4.33 | 3.73 | 3.19 | 3.10 | 2.00 | 3.37 | 3.04 |
| **Brown 5 `#63452c`** | **8.68** | **6.27** | **5.22** | 4.33 | **4.72** | 3.05 | **5.13** | 2.00 |
| Brown 5 + 15% black `#543b25` | 10.35 | 7.31 | 6.02 | 4.91 | 5.63 | 3.63 | 6.11 | 1.68 |
| Brown 5 + 30% black `#45301f` | 12.38 | 8.57 | 6.95 | 5.55 | 6.73 | 4.35 | 7.31 | 1.40 |
| `#857555` hue, HSL L .34 → `#6a5d44` | 6.44 | 4.83 | 4.11 | 3.48 | 3.50 | 2.26 | 3.80 | 2.70 |
| `#857555` hue, HSL L .30 → `#5d523c` | 7.67 | 5.61 | 4.74 | 3.96 | 4.17 | 2.69 | 4.53 | 2.26 |
| `#857555` hue, HSL L .28 → `#574d38` | 8.32 | 6.02 | 5.08 | 4.21 | 4.52 | 2.92 | 4.91 | 2.09 |
| Adwaita card style: page + 8% white = `#2e2c2a` | 13.91 | 9.47 | 7.64 | 6.05 | 7.56 | 4.88 | 8.21 | 1.25 |
| page + 12% white = `#373533` | 12.21 | 8.48 | 6.87 | 5.51 | 6.64 | 4.29 | 7.21 | 1.42 |

Lightest well on the current `#857555` hue/saturation (HSL H 40°, S 22%) that still meets each target:

| Target | Lightest same-hue well |
|---|---|
| white ≥ 4.5 | `#847555` (basically the current colour; 1 step darker) |
| white/80 ≥ 4.5 | `#706248` |
| white/70 ≥ 4.5 | `#61563e` |
| white/60 ≥ 4.5 | `#504633` |
| accent `#81d0ff` ≥ 4.5 | `#5e523c` |
| Light 4 `#c0bfbc` ≥ 4.5 | `#584d38` |
| Light 5 `#9a9996` ≥ 4.5 | `#383124` (too close to page) |
| white ≥ 7 (AAA) / white/80 ≥ 7 | `#635740` / `#4c4230` |

Well-vs-page: page `#1c1a17` has L ≈ 0.0105. Wells darker than ~`#45301f` fall below ~1.4:1 and need a border/ring (existing `border-white/15`, `ring-white/5..10`) to read as raised. Not a WCAG failure per section 2. [INFERENCE] visual separation is a design call.

Focus indicators on the well (1.4.11, ≥ 3:1) [COMPUTED]:

| Well | accent ring full | white ring full | `outline-ring/50` (base layer: `outline-ring/50`, accent at 50%) | white/50 |
|---|---|---|---|---|
| `#857555` | 2.65 FAIL | 4.49 pass | 1.65 FAIL | 2.33 FAIL |
| `#63452c` | 5.13 pass | 8.68 pass | 2.39 FAIL | 3.51 pass |
| `#574d38` | 4.91 pass | 8.32 pass | 2.37 FAIL | 3.43 pass |

The site's global base style applies `outline-ring/50` (`index.css` `@layer base`), so a default focus outline is a 50%-alpha accent. [INFERENCE: not verified per component whether focus-visible overrides it.] This would fail 3:1 on any of these wells. Full-opacity accent or white focus rings are needed (`home-experience.tsx` line 83–84 already uses a solid `ring-2 ring-(--adw-accent-color)` plus a light ring).

### Light mode (current) [COMPUTED]

| Text | on well `#ffffff` | on page `#f3efe5` | AA |
|---|---|---|---|
| `--adw-dark-5` #000000 | 21.00 | 18.29 | pass |
| `--adw-dark-2` #5e5c64 | 6.58 | 5.73 | pass |
| `--adw-accent-color` #0461be | 6.07 | 5.29 | pass |
| `--adw-dark-1` #77767b (project-showcase-card line 71) | 4.50 (exact 4.505) | 3.92 | pass on well by a hair, FAIL on page |
| `--adw-toc-inactive` #8a8376 | 3.76 | 3.27 | FAIL |
| black/60 (recent-posts meta) | — | 5.48 on page, 5.74 on white | pass |

Light mode is fine on the wells for the main text colours. `--adw-toc-inactive` (light) and `--adw-dark-1` on the page are outside this ticket and are listed for completeness.

## 4. Options

All options are dark-mode only; light mode needs no change for the audited text. Token is `--site-section-well-bg` in `.dark` (`index.css:256`), consumed by the files listed at the end.

### Option A (recommended): Brown 5 `#63452c` well + two text-token fixes

- Change: `.dark { --site-section-well-bg: #63452c; }` (the HIG palette's Brown 5, [SRC] hex). It stays a brown surface and is an actual Adwaita-palette colour.
- Results [COMPUTED]: white 8.68, white/80 6.27 (no change to `dark:text-white/80`), white/70 5.22, Light 4 4.72, accent 5.13 (text and focus ring both pass), well vs page 2.00.
- Still failing on Brown 5 and needing changes:
  - `white/60` (4.33): change `dark:text-white/60` in `home-recent-posts.tsx` (lines 38, 65) to `dark:text-white/70` (5.22).
  - `--adw-light-5` `#9a9996` (3.05): change `dark:text-(--adw-light-5)` on the well (home-about-me.tsx line 31, home-experience.tsx line 204) to `--adw-light-4` `#c0bfbc` (4.72).
  - `--adw-toc-inactive` dark `#8f877b` is 2.45 on Brown 5: use `--adw-light-4` `#c0bfbc` (4.72). Brown 1 `#cdab8f` does NOT work: 4.06 on Brown 5, 3.89 on `#574d38` [COMPUTED].
  - Base `outline-ring/50` focus outline must be solid (2.39 at 50%).
- Visual change: more saturated, darker chocolate brown than the current khaki/olive-brown; still clearly "warm brown". Well-vs-page contrast drops from 3.86 to 2.00, so the card edge is less stark, but the existing white/10–15 borders and inset shadows keep it readable.
- Pros: palette-sourced, no extra literals, passes all four text roles and the focus ring.
- Cons: noticeable hue/saturation shift. Brown 5 is more orange/red than `#857555`.

### Option B: same khaki hue, darkened `#574d38`

- Change: `.dark { --site-section-well-bg: #574d38; }` (the current hue/sat at HSL L .28). It is not a palette colour.
- Results [COMPUTED]: white 8.32, white/80 6.02, white/70 5.08, Light 4 4.52 (marginal), accent 4.91, well vs page 2.09. Focus: solid accent ring 4.91.
- Same text-token fixes as A: white/60 → white/70 or higher (4.21 fails), Light 5 → Light 4, `--adw-toc-inactive` lightened, solid focus rings.
- Visual change: smallest hue change (same khaki) but clearly darker than today.
- Pros: closest to the current look.
- Cons: not an Adwaita swatch, so it conflicts with the "based on Adwaita palette" claim in the `index.css` header. Light 4 only just passes (4.52).
- Minimum variant for body text only: `#706248` gives white 5.95, white/80 4.507, but accent 3.51 and Light 4 3.24 still fail. Not recommended as it leaves most roles failing. [COMPUTED for threshold, [INFERENCE] on "not recommended"]

### Option C: Adwaita-native card surface (page + 8% white)

- Change: dark well = `rgb(255 255 255 / 8%)` over the page (`#2e2c2a`), exactly libadwaita's `--card-bg-color` ([SRC] in the CSS variables page).
- Results [COMPUTED]: white 13.91, white/80 9.47, white/60 6.05, Light 5 4.88, accent 8.21. Everything passes without changing text colours. Well vs page 1.25.
- Visual change: loses the beige/brown look; becomes a dark neutral card, the opposite of the owner's goal.
- Pros: fully Adwaita-guided, lowest-risk compliance.
- Cons: contradicts "keep the beige/brown look".

Alternative that keeps `#857555` and changes only text: black text gives 4.67 but black/80 gives 3.97, and dark text on a dark-mode page is off-style for Adwaita (dark `*-fg-color` is `#ffffff`, [SRC]). Not recommended. [INFERENCE]

## 5. Answers to the questions

(a) Is there an Adwaita palette colour that keeps the look and gives white body text ≥ 4.5 and white/80 ≥ 4.5? Yes: Brown 5 `#63452c` (white 8.68, white/80 6.27). Brown 3 `#986a44` (4.69 / 3.63) and Brown 4 `#865e3c` (5.71 / 4.33) cannot do white/80. Brown 4 would need about white/90 (4.99 [COMPUTED]). [COMPUTED for the shown values] White/80 needs a background at or darker than `#706248` on the current hue. Secondary roles (white/60, Light 5, `#8f877b`, accent) also need token changes, as listed under A. Accent `#81d0ff` passes 4.5 on Brown 5 (5.13) and as a ≥ 3:1 focus ring.

(b) If the palette colour is not acceptable: Option B is the minimal token change (hex + the same text-token fixes).

## 6. Components and tokens each option touches

Because the colour is a single variable, the well swap (A, B, C) affects every consumer automatically: `home-section-start.tsx` (line 25), `home-about-me.tsx` (34, 46), `home-recent-posts.tsx` (33), `home-floating-nav.tsx` (98, dark only), `project-showcase-card.tsx` (58), `home-experience.tsx` (220, dark only), `articles-page-styles.ts` (7, 8), `projects/pages/project-page.tsx` (19, 20), `projects/pages/projects-page.tsx` (17, 48, 140).

Text tokens to review on the well (A and B):

| Where | Current | Replace |
|---|---|---|
| `dark:text-white/80` on the well: `home-section-start.tsx:36`, `home-experience.tsx:26`, `project-showcase-card.tsx:85`, `projects-page.tsx:25,142` | white/80 | pass on A (6.27) and B (6.02); no change |
| `dark:text-white/60` on the well: recent-posts card copy `home-recent-posts.tsx:38` (line 65, the loading note, sits on the page, not the well) | white/60 | `white/70` or higher |
| `dark:text-(--adw-light-5)`: `home-about-me.tsx:31` and the experience section intro sit on the page (`#1c1a17`), not the well; inside experience panels the dates/descriptions already use `white/80` | #9a9996 | no change needed for the well |
| `text-muted-foreground` on wells (`projects-page.tsx`, `project-page.tsx`) | dark `--muted-foreground` = Light 4 | pass on A (4.72) and B (4.52) |
| `--adw-toc-inactive` dark (`index.css:253`), TOC in `articles-page-styles.ts:23` | #8f877b | `--adw-light-4` `#c0bfbc` (Brown 1 fails, 4.06) |
| `dark:text-(--adw-light-1)` headings | white | pass |
| `--adw-accent-color` text on the well (`home-experience.tsx:74,145,243`) | #81d0ff | pass on A, B |
| Focus rings/outlines (`index.css` base `outline-ring/50`; `home-experience.tsx:83–84`) | accent at 50% | solid accent or white ring |

Not verified: components I did not read in full (`home-floating-nav.tsx` active/hover states, `articles-page-styles.ts` lines 14–19 text on accent backgrounds, which are on accent not the well).

## 7. Recommendation

Option A. Brown 5 `#63452c` is the one HIG palette colour that keeps the brown look and gives white 8.68:1, white/80 6.27:1, Light 4 4.72:1 and accent 5.13:1. White/60, Light 5, `--adw-toc-inactive` and the 50%-alpha focus outline need the small token changes in section 6. Option B is the fallback if the hue shift is too large.

Scripted numbers: run script `/tmp/c.py` (not kept in the repo).

## 8. Decision and outcome (issue #641)

The owner chose Option A, plus: recent-posts card copy `white/60` → `white/70`, dark `--adw-toc-inactive` → `--adw-light-4`, and a solid global focus outline (`outline-ring/50` → `outline-ring`). The Playwright spec `e2e/home-section-surfaces.e2e.ts` and the TOC test in `e2e/articles-toc-navigation.e2e.ts` now check rendered text on every dark well at 4.5:1 and the default focus outline at 3:1.

Still open, outside this change: the shadcn `Button` focus ring (`focus-visible:ring-ring/50`, 3px) is also accent at 50%, so on the dark well it measures about 2.39:1, the same failure as the old outline. [COMPUTED, section 3 focus table]
