# Articles TOC Navigation Full Analysis (2026-02-26)

## Scope
This document investigates why the Articles page TOC navigation can fail to move users to headings, cross-referencing:
- current implementation in the front-end
- prior investigation in `research/articles_toc_scroll_bug_reinvestigation.md`
- current stack behavior
- external documentation/forums
- rewritten behavior tests

## Inputs Reviewed
- `front-end/src/features/articles/pages/ArticlesPage.tsx`
- `front-end/src/shared/components/MarkdownRenderer.tsx`
- `front-end/src/shared/lib/markdown-headings.ts`
- `front-end/src/features/home/pages/HomePage.tsx`
- `front-end/src/features/home/components/HomeFloatingNav.tsx`
- `front-end/src/features/home/components/home-section-nav-scroll.ts`
- Existing tests and updated tests in:
  - `ArticlesPage.toc-consistency.test.ts`
  - `ArticlesPage.layout.test.ts`
- Previous research: `research/articles_toc_scroll_bug_reinvestigation.md`

## Cross-Reference With Previous Reinvestigation
The prior document proposed two major root causes:
1. Non-native fragment handling (`preventDefault` + custom scroll + `replaceState`) can leave URL/hash updated without browser fragment navigation semantics.
2. TOC extraction and rendered heading IDs were generated through different pipelines, creating potential drift.

Status after this reinvestigation:
- (1) remains valid and is still an architectural risk.
- (2) was confirmed with concrete reproductions and is now partially mitigated by implementation updates in this ticket (details below).

## Tech Stack Context
- Router: `react-router@7.13.0`
- Markdown render path: `react-markdown` + `remark-gfm` + `rehype-highlight`
- Current TOC extraction path: custom markdown line parser (`extractMarkdownHeadings`) used by `extractArticleTableOfContents`
- Current heading render path: `MarkdownRenderer` custom heading components (`h1/h2/h3`) that compute IDs

The key fragility: TOC IDs and rendered heading IDs were generated from two distinct interpretations of markdown content.

## Local Findings (Implementation + Behavior)

### 1) TOC ID drift was reproducible on valid markdown
Before the code changes in this ticket, IDs diverged for valid markdown heading content patterns:
- reference-style links in headings (`## [Label][ref]`)
- inline HTML in headings (`## Title with <span>inline html</span>`)
- fenced code blocks containing `#`/`##` lines (false-positive TOC headings)

Concrete consequence:
- TOC can contain IDs that do not exist in rendered heading elements.
- Clicking those TOC items cannot scroll to the intended target because no matching DOM ID exists.

### 2) Current content files happened to align, but parser mismatch still existed
For current `content/*.md`, TOC and rendered IDs matched. However, this did not invalidate the bug class; it only showed current content avoided those specific syntactic edge cases.

### 3) Articles TOC navigation remains custom/manual
`ArticlesPage` currently intercepts TOC clicks and uses:
- `event.preventDefault()`
- `scrollIntoView({ behavior: "smooth", block: "start" })`
- `history.replaceState(...#id)`

This means native hash-navigation behavior is intentionally bypassed on primary clicks.

## Differences: Articles TOC vs Home Bottom Navigation

### Similarities
- Both use anchor-shaped interactions and then programmatic scrolling.
- Both update URL fragment/history after scroll attempt.

### Important differences relevant to reliability
1. **Target identity source**
- Articles TOC target IDs are derived from markdown parsing + custom slug logic.
- Home bottom nav target IDs are static section IDs from `HOME_SECTIONS` config and element IDs in markup.
- Impact: Articles can fail if parsing/rendering ID pipelines drift; Home has no markdown parsing drift risk.

2. **Target rendering timing complexity**
- Articles targets depend on async content fetch + markdown render pipeline.
- Home sections are deterministic page structure.
- Impact: Articles has higher timing/shape variability than Home.

3. **Scroll behavior policy**
- Articles TOC currently hardcodes `smooth` in `navigateToArticleHeadingById`.
- Home nav uses `resolveAnchorScrollBehavior(...)` and respects reduced-motion preference.
- Impact: Home behavior is more explicit with accessibility preference handling.

4. **Hash handling scope**
- Articles uses `pathname + search + #id` replacement and also hash-based auto-navigation after article load.
- Home uses section hash replacement from page-level section anchors.
- Impact: Articles has more moving parts due article state and async content lifecycle.

## Internet and Forum Findings

### Browser/documentation findings
1. `hashchange` is **not** fired when hash is modified via `history.pushState()`/`replaceState()`.
- MDN: `Window: hashchange event`

2. `:target` target state is not updated by `pushState`/`replaceState`.
- MDN: `:target` selector description

3. `scrollIntoView()` scrolls ancestor containers; fixed-header offsets should use `scroll-margin-top`.
- MDN: `Element.scrollIntoView()`
- This aligns with the project’s existing `scroll-mt-[5.25rem]` on headings.

4. `react-markdown` uses a unified pipeline (`markdown -> mdast -> remark -> hast -> rehype -> React elements`), and HTML is escaped by default unless `rehype-raw` is enabled.
- `react-markdown` README (Architecture + HTML behavior)
- This explains why heading text normalization must match rendered output semantics.

5. `rehype-slug` exists specifically to add heading IDs using `github-slugger`.
- `rehype-slug` README
- Indicates ecosystem-standard approach for single-source heading ID generation.

6. CommonMark: setext and fenced code blocks have strict parsing rules; fenced code content is literal and must not be interpreted as headings.
- CommonMark spec sections `#setext-headings` and `#fenced-code-blocks`

### Forum/community findings
1. React Router discussion confirms internal hash-scroll behavior patterns and `scrollIntoView` usage in router scroll restoration internals.
- `remix-run/react-router` discussion #10038

2. Community reports (GitHub/StackOverflow search results) repeatedly describe hash-scroll issues when content is async-rendered or when custom scroll handling races content availability.
- Used as supporting signal, not as primary authority.

## Test Rewrite and Verification

### Added/updated tests
1. `ArticlesPage.toc-consistency.test.ts`
- Added a new explicit behavior test covering complex markdown headings:
  - reference link headings
  - inline HTML in headings
  - headings containing images
  - fenced code with `#` lines
- Assertion: TOC IDs must equal rendered heading IDs in order.

2. `ArticlesPage.layout.test.ts`
- Expanded `navigateToArticleHeadingById` tests to explicitly assert:
  - `scroll` stage logging payload when target exists
  - `fallback-hash` stage logging payload when target missing
  - URL/hash side effects associated with each behavior path

### Implementation updates made to satisfy behavior tests
- `front-end/src/shared/lib/markdown-headings.ts`
  - `normalizeMarkdownHeadingText` exported and extended to normalize reference-style links.
  - Added fenced code block tracking so heading markers inside fenced code are ignored.
- `front-end/src/shared/components/MarkdownRenderer.tsx`
  - Heading ID text now uses shared `normalizeMarkdownHeadingText(flattenNodeText(...))` for tighter parity.
  - `flattenNodeText` updated to include image `alt` where appropriate.

## Live Testing / Runtime Validation
- Docker stack was started successfully with `docker compose up -d --build`.
- Services were healthy (`docker compose ps`) and backend health endpoint responded.
- Constraint: interactive browser automation was not available in this environment, so click-path visual confirmation was limited to static/runtime checks and behavior tests.

## Findings Issue List
1. **Confirmed issue (fixed in this ticket):** TOC extraction could include false headings from fenced code and produce ID drift for complex heading syntax.
2. **Remaining architectural risk:** Articles TOC still intercepts native fragment navigation and relies on custom scroll + `replaceState`; browser-native fragment semantics are not the primary path.
3. **Residual verification gap:** no in-environment real browser click E2E was available in this run.

## Conclusion
Primary conclusion: there were real, reproducible TOC ID-generation inconsistencies between markdown extraction and rendering paths. These inconsistencies are sufficient to explain non-working TOC navigation for specific markdown patterns, and have now been mitigated by parser/renderer alignment updates plus explicit behavior tests.

Secondary conclusion: even with ID alignment improved, the Articles TOC still depends on a custom navigation path (`preventDefault` + manual scroll + `replaceState`). Based on browser and router docs, this remains less robust than native fragment navigation semantics and should be considered the next area for hardening if user-visible jump failures persist.

## References
- MDN `hashchange` event: https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event
- MDN `:target`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:target
- MDN `Element.scrollIntoView()`: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- MDN `Location.hash`: https://developer.mozilla.org/en-US/docs/Web/API/Location/hash
- MDN `History.replaceState()`: https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
- React Router `Link`: https://reactrouter.com/api/components/Link
- React Router `ScrollRestoration`: https://reactrouter.com/api/components/ScrollRestoration
- React Router discussion #10038: https://github.com/remix-run/react-router/discussions/10038
- react-markdown README: https://github.com/remarkjs/react-markdown
- rehype-slug README: https://github.com/rehypejs/rehype-slug
- mdast: https://github.com/syntax-tree/mdast
- mdast-util-to-string: https://github.com/syntax-tree/mdast-util-to-string
- CommonMark spec: https://spec.commonmark.org/0.31.2/
