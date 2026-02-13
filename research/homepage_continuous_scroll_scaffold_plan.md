# Homepage Continuous Scroll Scaffold Plan

Research date: **2026-02-08**

Related bead ticket: `website-mtc`

## 1. Scope and research inputs

Goal: define an implementation-ready scaffold for a continuous homepage that progresses section-by-section while scrolling. This plan covers scaffolding only; final copy/content is out of scope.

Primary references reviewed:

- `https://github.com/projectbluefin/website`
- `https://github.com/ublue-os/bazzite.gg`
- `https://bazzite.gg/` (for section and navigation behavior)
- MDN/Chrome guidance for section observation and anchored navigation:
  - `https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver`
  - `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-top`
  - `https://developer.chrome.com/docs/css-ui/sticky-headers`
  - `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`

Notes from repository inspection:

- `ublue-os/bazzite.gg` shows a content-forward landing layout with clear top-level sections and strong in-page progression (hero -> feature/value blocks -> docs/news/community -> CTA/footer), and repository structure that separates docs/static/about content.
- `projectbluefin/website` is available and indicates a modern static-site structure (`src`, `public`, Astro config), which aligns with section-oriented homepage composition.
- Due to GitHub cache/render restrictions in this environment, deep blob inspection was intermittent. The plan below uses observed repository structure, accessible metadata, and live behavior from `bazzite.gg`.

## 2. Proposed section map (ordered)

This order is optimized for a continuous homepage with progressive disclosure:

1. `hero` - strong identity + primary CTA.
2. `value-pillars` - 3 to 4 concise value statements.
3. `feature-strips` - alternating media/text rows for key features.
4. `proof` - ecosystem trust, stats, testimonials, or logos.
5. `community-and-docs` - paths to docs/community/social.
6. `secondary-cta` - conversion-focused block before footer.
7. `footer` - global links and legal.

Section IDs should be stable and URL-addressable (`#hero`, `#value-pillars`, etc.) to support anchor linking and deep links.

## 3. Interaction scaffold

Target behavior:

- Standard document scroll (not hard full-page snap) with section-aware navigation.
- Sticky "On this page" rail on desktop; condensed jump menu on mobile.
- Active section tracking using `IntersectionObserver` and section IDs.
- Smooth in-page anchor navigation when motion preference allows; instant jump when reduced motion is preferred.

Implementation details:

- Keep existing global `TopBar` as-is.
- Add a home-local in-page navigator component that reads section metadata.
- Use section metadata as the source of truth for:
  - rendered section order,
  - nav items,
  - active section state updates.
- Apply `scroll-margin-top` on section wrappers so anchored navigation accounts for sticky header height.

## 4. Responsive behavior

Desktop (`lg` and up):

- Two-column layout: primary content column + sticky right rail section nav.
- Rail highlights active section and supports click-to-anchor.

Tablet (`md` to `lg`):

- Single content column with compact sticky top subsection nav (horizontal scroll allowed).

Mobile (`< md`):

- Single column continuous flow.
- Collapsible "Jump to section" control (sheet or disclosure) to avoid persistent viewport loss.

All breakpoints:

- Preserve semantic section order and keyboard navigation parity.
- Do not rely on hover-only affordances.

## 5. Performance and accessibility constraints

Accessibility:

- Use semantic landmarks (`<main>`, `<section aria-labelledby=...>`).
- Every section heading must be unique and mapped to nav labels.
- Ensure keyboard users can reach and activate all in-page links.
- Respect `prefers-reduced-motion`; disable smooth-scrolling transitions for reduced motion users.
- Preserve visible focus styles for all anchor controls.

Performance:

- Keep scaffolding components lightweight; avoid heavy animation libraries in the first iteration.
- Defer non-critical media in lower sections (`loading="lazy"` where applicable).
- Keep observer count bounded (one observer instance for all tracked sections).
- Avoid scroll listeners for active-state tracking when `IntersectionObserver` can be used.

## 6. File and module scaffolding (feature-based)

This structure extends the existing frontend feature layout (`front-end/src/features/home/*`) and keeps shared primitives in `shared`.

```text
front-end/src/features/home/
  components/
    HomeSection.tsx
    HomeSectionNav.tsx
    HomeSectionNavMobile.tsx
  config/
    home-sections.ts
  hooks/
    useActiveHomeSection.ts
  pages/
    HomePage.tsx
  types/
    home-section.ts
```

Shared support (only if needed by multiple features):

```text
front-end/src/shared/hooks/
  use-prefers-reduced-motion.ts
```

Scaffold contracts:

- `home-sections.ts`: ordered section definitions (`id`, `label`, placeholder content tokens).
- `HomeSection.tsx`: semantic wrapper with consistent spacing and anchor behavior.
- `useActiveHomeSection.ts`: section observer hook returning active section ID.
- `HomeSectionNav.tsx` and `HomeSectionNavMobile.tsx`: desktop/mobile in-page navigation surfaces.
- `HomePage.tsx`: compose sections from `home-sections.ts` only, no hard-coded duplicated nav structures.

## 7. Test strategy (scaffold phase, no final content yet)

Test goals:

1. render integrity for all scaffolded sections,
2. anchor and active-nav behavior,
3. basic accessibility guarantees.

Proposed tests (`bun test` under `front-end`):

- `front-end/src/features/home/config/home-sections.test.ts`
  - verifies unique section IDs and stable ordering.
- `front-end/src/features/home/hooks/useActiveHomeSection.test.ts`
  - mocks `IntersectionObserver` and verifies active-section updates.
- `front-end/src/features/home/components/HomeSectionNav.test.tsx`
  - verifies nav renders all configured sections and applies active state.
- `front-end/src/features/home/pages/HomePage.test.tsx`
  - verifies scaffold section wrappers render with expected IDs/headings.
  - verifies in-page links target valid existing section anchors.

Non-functional guardrail:

- Behavior baseline should remain stable while scaffolding evolves.
- The scaffold ticket should avoid content-coupled assertions so later content updates do not require structural test rewrites.

## 8. Implementation sequence for follow-up ticket (`website-des`)

1. Create section types + `home-sections` config.
2. Add section wrapper + section nav components.
3. Add active-section hook with observer logic.
4. Refactor `HomePage` to render from config and wire nav.
5. Add tests listed above.
6. Run full workspace quality gates (`bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`).

## 9. References

- `https://github.com/projectbluefin/website`
- `https://github.com/ublue-os/bazzite.gg`
- `https://bazzite.gg/`
- `https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver`
- `https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-margin-top`
- `https://developer.chrome.com/docs/css-ui/sticky-headers`
- `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion`
