# Icon Integration Research

Research date: **2026-02-14**

Related bead ticket: `website-223`

## 1. Current stack findings

- Front-end stack is React + TypeScript + Vite + shadcn UI.
- `lucide-react` is already installed (`front-end/package.json` and `bun.lock`) at `^0.563.0`.
- The codebase already uses Lucide icons in multiple places:
  - `front-end/src/shared/components/TopBar.tsx`
  - `front-end/src/shared/components/ThemeToggle.tsx`
  - `front-end/src/shared/components/ui/sheet.tsx`
  - `front-end/src/shared/components/ui/dropdown-menu.tsx`
  - `front-end/src/features/articles/pages/ArticlesPage.tsx`
- Candidate icons for homepage nav were verified from installed Lucide type exports in:
  - `front-end/node_modules/lucide-react/dist/lucide-react.d.ts`

## 2. Integration options that fit this project

## Option A: Use `lucide-react` (already in project)

- Effort: very low.
- Dependency impact: none (already installed and in use).
- Styling fit: strong (icons inherit text color, easy sizing with Tailwind classes).
- Bundle impact: low (tree-shakeable imports).
- Accessibility: straightforward (`aria-hidden="true"` on decorative icons + visible text labels).

Implementation pattern:

```tsx
import { House } from "lucide-react";

<House className="size-4" aria-hidden="true" />
```

## Option B: Inline custom SVG components

- Effort: medium.
- Dependency impact: none.
- Best use: when we need fully custom/brand-specific glyphs.
- Tradeoff: extra maintenance compared to using a maintained icon set.

Implementation pattern:

- Add files under `front-end/src/shared/components/icons/`
- Export typed React SVG components.
- Reuse with class-based sizing/color (`className="size-4"`).

## Option C: Static SVG files from `public/` + `<img>`/`<svg>`

- Effort: low to medium.
- Dependency impact: none.
- Best use: fixed illustration-like icons that do not need stroke/color adaptation.
- Tradeoff: less flexible for theme-aware color than Lucide React components.

## 3. Recommended direction

1. Primary recommendation: **Option A (`lucide-react`)** for navbar icons.
2. Secondary recommendation: use **Option B (inline custom SVG)** only for any icon that Lucide cannot represent well.
3. Avoid adding new icon dependencies for now; current stack already supports this feature without package changes.

## 4. Icon set recommendations for homepage navbar

Navbar sections:
`home`, `for you`, `for devs`, `conquer`, `strengthen`, `independence`, `inner peace`

## Set 1 (Recommended)

- `home` -> `House`
- `for you` -> `UserRound`
- `for devs` -> `CodeXml`
- `conquer` -> `Trophy`
- `strengthen` -> `Dumbbell`
- `independence` -> `ShieldCheck`
- `inner peace` -> `Sparkles`

## Set 2 (Softer tone)

- `home` -> `HouseHeart`
- `for you` -> `HeartHandshake`
- `for devs` -> `CodeXml`
- `conquer` -> `Target`
- `strengthen` -> `Dumbbell`
- `independence` -> `Shield`
- `inner peace` -> `Leaf`

## Set 3 (Minimal/general)

- `home` -> `House`
- `for you` -> `User`
- `for devs` -> `CodeXml`
- `conquer` -> `Compass`
- `strengthen` -> `Dumbbell`
- `independence` -> `Shield`
- `inner peace` -> `Smile`
