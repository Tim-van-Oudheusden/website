# Articles TOC Scroll Bug Reinvestigation (2026-02-26)

## Scope
This note investigates why TOC clicks on the Articles page can still fail to move to the expected markdown heading, despite recent fixes in `front-end/src/features/articles/pages/ArticlesPage.tsx` and `front-end/src/shared/components/MarkdownRenderer.tsx`.

## Current Implementation Snapshot
- TOC entries are extracted from raw markdown with a regex in `extractArticleTableOfContents(...)`.
  - It only parses ATX-style headings (`#`, `##`, `###`) and builds IDs via a custom `slugifyHeading`.
- Rendered heading IDs are produced separately in `MarkdownRenderer` using a second custom slugger over rendered node text (`flattenNodeText`).
- TOC click behavior prevents default anchor navigation and calls `navigateToArticleHeadingById(...)`, which:
  1. calls `element.scrollIntoView({ behavior: "smooth", block: "start" })`
  2. updates URL via `window.history.replaceState(...#id)`.

## Web Findings Relevant to This Stack
1. `scrollIntoView()` scrolls ancestor containers, and alignment with fixed headers should use `scroll-margin-top`.
   - Source: MDN `Element.scrollIntoView()`
2. `history.replaceState()` changes URL without triggering `hashchange`.
   - Source: MDN `hashchange` event page
3. CSS `:target` is not updated by `pushState()` or `replaceState()`.
   - Source: MDN `:target`
4. `id` values must be unique in a document.
   - Source: MDN `id` global attribute
5. React Router `<Link>` is an enhanced `<a>`, but router/navigation handlers can prevent native browser behavior.
   - Source: React Router `Link` API
6. React Router scroll restoration logic includes hash-based element lookup when enabled.
   - Source: React Router discussion #10038 (maintainer-linked behavior)
7. `rehype-slug` exists specifically to assign heading IDs and uses `github-slugger`.
   - Source: `rehype-slug` README
8. CommonMark supports both ATX and Setext headings.
   - Source: CommonMark spec

## Most Likely Root Causes (Ranked)

### 1) Missing native hash-navigation fallback after preventDefault (High confidence)
TOC clicks currently bypass native anchor behavior. If `scrollIntoView` misses for any reason (timing, missing ID, wrong target), `replaceState` updates the hash but does not trigger browser hash navigation or `hashchange`. This leaves the URL changed but scroll unchanged.

Why this fits the symptom:
- User sees "did not jump" even though hash can still update.
- The code path has only one scrolling attempt and no fallback.

### 2) ID mismatch risk because TOC and renderer use different heading extraction pipelines (High confidence)
TOC IDs are created from raw markdown regex parsing; rendered heading IDs come from React node text flattening. These are not guaranteed to stay identical for all markdown forms (inline HTML/entities/escaped text/link rendering edge cases), and TOC parsing currently ignores Setext headings.

Why this fits the symptom:
- A mismatched TOC ID means `getElementById` returns `null`, so no scroll happens.
- This can affect some headings but not others, matching intermittent "next heading" complaints.

### 3) ID collision / first-match navigation (Medium confidence)
If duplicate IDs occur, `getElementById` returns the first matching element. That can feel like jumping to the wrong (often earlier) heading.

### 4) Timing/layout race around asynchronous rendering/layout changes (Medium confidence)
A single `requestAnimationFrame` retry on article-load hash handling may still be too early in some render/layout cases. If click scroll attempts happen before final layout settles, target alignment can be inconsistent.

## Recommended Fix Direction
1. Use one heading-ID pipeline for both TOC and rendered markdown.
- Prefer `rehype-slug` (uses `github-slugger`) for rendered IDs.
- Build TOC from the same parsed markdown AST (or derive from rendered heading list), not from a separate regex slugger.

2. Restore a native fragment fallback.
- After manual scroll attempt fails, set `window.location.hash = headingId` (or equivalent fallback path) so browser-native behavior can execute.
- Avoid relying only on `replaceState` for fragment navigation semantics.

3. Add observability and deterministic tests.
- Add a test matrix with headings that include:
  - inline links/code/emphasis
  - punctuation and apostrophes
  - duplicates
  - non-ASCII
  - Setext headings
- Add runtime debug logging (temporary) for clicked ID, matched element, and final `scrollY` delta.

4. Add end-to-end verification.
- Add Playwright/Cypress test: click each TOC item and assert the target heading is near viewport top with header offset considered.

## Conclusion
The strongest technical explanation is a combination of:
- non-native fragment handling (`preventDefault` + `replaceState` without hash-navigation fallback), and
- non-unified heading-ID generation between TOC extraction and markdown rendering.

This combination can produce exactly the "some TOC clicks still do not jump" behavior, even after adding `h1` IDs and explicit `scrollIntoView`.

## References
- MDN: Element.scrollIntoView() - https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
- MDN: hashchange event - https://developer.mozilla.org/en-US/docs/Web/Events/hashchange
- MDN: :target pseudo-class - https://developer.mozilla.org/en-US/docs/Web/CSS/:target
- MDN: HTML id global attribute - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/id
- React Router Link API - https://reactrouter.com/api/components/Link
- React Router discussion #10038 - https://github.com/remix-run/react-router/discussions/10038
- rehype-slug README - https://github.com/rehypejs/rehype-slug
- CommonMark spec (headings) - https://spec.commonmark.org/0.31.2/#headings
