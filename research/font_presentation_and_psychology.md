# Font Presentation and Psychology

## Scope
This research focuses on how font variants (weight, size, italics, spacing, contrast) influence attention and readability, and how to apply that to our chosen sans family direction.

## What the research indicates

### 1. Typography influences perception and processing
- Experimental research reports that typography can affect emotional and physiological responses while reading, not just aesthetics.
- Studies also indicate that typeface choices can influence semantic processing and reading behavior.

### 2. Bold is the strongest inline attention signal
- Evidence from emphasis studies indicates boldface tends to improve word/keyword identification more than italics.
- Overuse reduces the effect: if everything is bold, nothing stands out.

### 3. Italics are weaker for fast scanning
- Multiple findings suggest italics are less efficient than bold for quick word identification.
- Italics work better as a nuanced secondary emphasis (tone, citation, foreign terms) than as a primary attention mechanism.

### 4. Size and hierarchy directly shape scan behavior
- Readability research supports meaningful type hierarchy and adequate default text size.
- WCAG guidance defines "large text" as at least `18pt` regular or `14pt` bold (roughly `24px` / `18.5px`) for contrast exceptions.
- Baymard's large-scale usability findings recommend line lengths around `50-75` characters for body text.

### 5. Contrast and spacing are part of attention design
- WCAG contrast requirements (`4.5:1` for normal text, `3:1` for large text) are foundational for readability and attention reliability.
- WCAG text-spacing rules reinforce that readable spacing is essential for comprehension and should not break layouts.

## Applying this to our font system

Given our direction (`Source Sans 3` stack), use presentation variants like this:

- `400` for long-form body text.
- `500` for interactive labels and navigation.
- `600` for section titles and high-priority labels.
- `700` sparingly for critical emphasis (warnings, key metrics, callouts).
- `italic` only for secondary semantic emphasis, not primary attention capture.

## Recommended size/form baseline

- Body: `16-18px`, `line-height` around `1.5-1.7`.
- Headings: clear step-ups (for example `h2` around `28-32px`, `h3` around `22-26px`).
- Keep line length near `50-75` characters on article content.
- Reserve all-caps for very short UI labels only.
- Prefer weight + size changes over color-only emphasis.

## Generalized recommendations

1. Use hierarchy first: size, then weight, then color.
2. Default to regular/medium text (`400-500`) and spend bold (`600-700`) intentionally.
3. Treat italics as a subtle semantic cue, not a main call-to-action pattern.
4. Keep content readable before decorative: contrast, spacing, and line length are non-negotiable.
5. Keep emphasis scarce and consistent so users learn what "important" looks like.
6. Validate with real content density on desktop and mobile, not isolated component screenshots.

## Sources
- PubMed (2018): *Effects of typeface design on text legibility under normal and low vision*: https://pubmed.ncbi.nlm.nih.gov/30293477/
- PubMed (2023): *How typography affects readers*: https://pubmed.ncbi.nlm.nih.gov/37715010/
- Cambridge University Press: *The effects of typographical emphasis in text* (abstract): https://www.cambridge.org/core/journals/applied-psycholinguistics/article/effects-of-typographical-emphasis-in-text/5D48214F934DF217003CFB491BB2256F
- John Benjamins: *The role of italic and boldface type in processing text* (abstract): https://benjamins.com/catalog/idj.8.1.04vla
- PubMed (font size/reading speed): https://pubmed.ncbi.nlm.nih.gov/30532555/
- W3C WCAG 2.2 Understanding 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- W3C WCAG 2.2 Understanding 1.4.12 Text Spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
- Baymard Institute (line length): https://baymard.com/blog/line-length-readability
