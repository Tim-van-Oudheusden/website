# TOC Failed Implementations Overview

Date: 2026-02-26

## Scope
This document lists all Articles TOC navigation-related work that has been attempted and did not fully resolve the user-facing problem (TOC links still not reliably navigating to headings).

## Sources Reviewed
- Beads issue history in `.beads/issues.jsonl`
- TOC-related beads issues:
  - `website-0bm`
  - `website-7sg`
  - `website-ho0`
  - `website-obl`
  - `website-iw3q`
  - `website-6eqz`
  - `website-pywx`
  - `website-isp8`
  - `website-awg2`
- Documentation:
  - `research/articles_right_side_toc_options.md`
  - `research/articles_toc_scroll_bug_reinvestigation.md`
  - `research/articles_toc_navigation_full_analysis.md`
- Related implementation commits:
  - `37011f7`, `5fd4006`, `8830fc0`, `2a6a224`, `7107c38`, `e542743`, `586f675`

## Chronological List Of Tried Implementations That Did Not Fully Work

1. Initial right-side TOC implementation (`website-7sg`, commit `37011f7`)
- What was tried:
  - Added right-side TOC with heading anchors.
  - Added markdown heading IDs and TOC rendering for article headings.
- Why it did not fully work:
  - Follow-up bug tickets were opened immediately for missing heading coverage and failed heading jumps (`website-ho0`, `website-obl`).

2. Include H1 headings in TOC (`website-ho0`, commit `5fd4006`)
- What was tried:
  - Expanded TOC extraction/rendering to include H1 entries.
- Why it did not fully work:
  - Navigation bug remained; next issue (`website-obl`) still reported TOC clicks not navigating correctly.

3. Add H1 anchors in markdown renderer (`website-obl` path, commit `8830fc0`)
- What was tried:
  - Added explicit H1 IDs/anchors in `MarkdownRenderer` so TOC IDs could target H1 nodes.
- Why it did not fully work:
  - User-reported heading jump failure persisted, leading to reinvestigation ticket `website-iw3q`.

4. Manual click navigation hardening (`website-iw3q`, commit `2a6a224`)
- What was tried:
  - Intercepted TOC clicks with `preventDefault`.
  - Introduced `navigateToArticleHeadingById` with `scrollIntoView(...)`.
  - Updated URL using `history.replaceState(...#id)` and fallback hash handling.
- Why it did not fully work:
  - Subsequent issues/research confirmed this approach can update URL without native hash-navigation semantics (`hashchange`/`:target` behavior), and user still reported non-jumping TOC.

5. Research pass on persistent bug (`website-6eqz`, `research/articles_toc_scroll_bug_reinvestigation.md`)
- What was tried:
  - Investigated likely root causes and recommended fixes.
- Why it did not fully work:
  - Research only; issue persisted until more implementation work was attempted.

6. "Implement all recommendations" pass (`website-pywx`, commit `7107c38`)
- What was tried:
  - Unification/hardening work around TOC ID generation and navigation behavior.
  - Added stronger tests around TOC consistency/navigation.
- Why it did not fully work:
  - User reported the bug still existed afterward (explicitly referenced by later request saying `Website-iw3q did not solve it either`, then further TOC bug reinvestigation requests).

7. Deep-dive analysis + explicit behavior tests + parser/renderer parity fixes (`website-isp8`, commit `e542743`)
- What was tried:
  - Added complex heading consistency tests.
  - Fixed mismatches like fenced-code false positives and reference-style heading normalization.
  - Documented broader analysis and residual risk in `research/articles_toc_navigation_full_analysis.md`.
- Why it did not fully work:
  - User still reported TOC navigation failure after this pass, indicating remaining runtime behavior issues beyond ID drift fixes.

8. Native fragment semantics restoration (`website-awg2`, commit `586f675`)
- What was tried:
  - Removed TOC click interception (`preventDefault`) to allow native anchor behavior.
  - Changed successful navigation hash updates toward native fragment path.
- Why it did not fully work:
  - Latest user report states TOC navigation still does not navigate under any condition.

## Pattern Across Failed Attempts
1. Multiple fixes solved specific sub-problems (H1 coverage, some ID mismatches, custom navigation assumptions) but did not eliminate the full runtime failure.
2. Most attempts were frontend-logic-level fixes validated by unit/integration tests, but end-to-end real-browser validation remained limited.
3. The issue has recurred across multiple implementation paradigms:
- custom programmatic scroll path
- parser/renderer ID alignment path
- native fragment path

## Research Recommendations That Have Not Been Fully Realized End-To-End
From the reviewed docs, these were repeatedly identified but not completed as a full production validation loop:
1. A real browser E2E test that clicks each TOC item and asserts viewport position near target heading.
2. A single-source heading ID generation approach directly tied to markdown AST/render output (docs repeatedly suggest this class of solution; implementation to date has been incremental custom alignment).

## Conclusion
The project has already tried several substantial TOC-navigation fixes across both architecture and implementation details. Based on beads history and documentation, each pass addressed part of the problem, but none fully resolved the user-observed runtime behavior. The TOC bug should be treated as still open in practical terms despite multiple closed tickets.
