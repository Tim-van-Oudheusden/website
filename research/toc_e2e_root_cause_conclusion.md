# TOC E2E Root Cause Conclusion

Date: 2026-02-26

## Scope
This document captures what the new Playwright E2E diagnostics revealed about the persistent Articles TOC navigation bug.

## E2E Tests Used
- `e2e/articles-toc-navigation.e2e.ts`
  - `renders the articles page with a visible TOC`
  - `reveals runtime TOC/heading id drift signature`
  - `shows click-path mismatch: hash updates but target heading id does not exist`

All three tests pass as diagnostic assertions against current buggy runtime behavior.

## Runtime Evidence
1. TOC and heading IDs diverge at runtime.
- Example captured from live browser diagnostics:
  - TOC link IDs: `["welcome"]`
  - Rendered heading IDs: `["welcome-1"]`

2. TOC click updates URL hash to the TOC target, but that target does not exist in DOM.
- Example captured from live browser diagnostics:
  - clicked href: `#welcome`
  - resulting hash: `#welcome`
  - `document.getElementById("welcome")` => `null`
  - existing heading ID list includes `welcome-1`

3. The failure mode is therefore not “hash not updating”; it is “hash points to an element ID that does not exist”.

## Root Cause
The runtime ID mismatch is consistent with stateful heading ID generation being reused across React Strict Mode development double-renders.

Concretely:
- `front-end/src/main.tsx` wraps the app in `<StrictMode>`.
- `front-end/src/shared/components/MarkdownRenderer.tsx` creates a mutable resolver via `createHeadingIdResolver()` and stores it in `useMemo`.
- Heading IDs are then produced by repeatedly calling that mutable resolver while rendering heading components.

Because resolver state (slug counters) is mutable and shared across render passes, the final committed pass can produce offset IDs (for example `welcome-1`) while TOC extraction expects base IDs (for example `welcome`).

## Why Previous Non-E2E Tests Missed This
- Existing tests around heading extraction/consistency are primarily server-render/static-path checks.
- They do not exercise browser runtime behavior under the Strict Mode render lifecycle used in the app.

## Recommended Fix Direction (Not Implemented Here)
1. Remove mutable per-render resolver state from runtime heading component callbacks (or recreate resolver in a way that is deterministic per render pass).
2. Prefer a single deterministic heading-ID source that is not sensitive to render-pass count.
3. Keep the new E2E diagnostics and add a final behavioral E2E assertion that TOC click lands on an existing heading target after the fix.

## Conclusion
The E2E investigation isolates the primary blocker: **TOC links and rendered heading IDs are mismatched at runtime (`id` drift), so fragment navigation targets do not exist.**
This explains the persistent user-visible behavior where TOC navigation fails despite multiple prior fixes.
