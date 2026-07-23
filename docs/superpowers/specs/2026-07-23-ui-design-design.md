# Kalia UI design — design tokens & primitives

**Status:** approved (pending spec review) · **Roadmap:** Iteration 2, task 8
**Date:** 2026-07-23

## Goal

Give Kalia a deliberate, professional visual identity — replacing the
current Tailwind-defaults placeholder (zinc grayscale, Geist fonts, ad hoc
utility classes repeated per component) — and centralize it in reusable
design tokens plus a small set of shared UI primitives, so later features
inherit a consistent look instead of reinventing it.

## Aesthetic direction

Craft-label / brewery aesthetic (serif display heading + clean sans body,
tag-chip accents) rendered in a warm 1950s pastel palette, used sparingly:
mostly white/cream space with charcoal text, pastels reserved for one
primary action color and one quiet tag/accent color. No dark mode — the
palette is a light-mode design; the existing `prefers-color-scheme: dark`
branch and all `dark:` Tailwind variants are removed rather than adapted.

Design direction was explored with the product owner using mockups
(palette comparison → restrained/whitespace pass → background-tint
comparison → primary-color assignment → font-pairing comparison). Decisions:

- Background: warm cream (`#FAF3E9`)
- Primary action color: deep mint (`#2F6F5E`)
- Accent/tag color: pale coral tint (`#FBEAE5`), quiet — not used for primary actions
- Text: near-black charcoal (`#2B2725` body, `#5A5450` muted)
- Typography: Fraunces (display/headings) + Inter (body/UI)

## Token architecture

Two-layer system in `frontend/app/globals.css`: raw primitives, and a
semantic layer that components actually reference — so a future re-theme
only touches the semantic layer, never component code. Follows the same
Tailwind v4 CSS-first pattern (`@theme inline`) already present in the
file today; no new dependency, no JS token pipeline (that would be tooling
built years ahead of the need — Kalia is one app at the "preliminary
design" stage, revisit only if a second consuming app or a JS-side color
need ever appears).

**Primitives:**

| Token | Value | Role |
|---|---|---|
| `--cream-50` | `#FAF3E9` | page background |
| `--mint-600` | `#2F6F5E` | deep mint — primary actions |
| `--mint-100` | `#EAF5F1` | pale mint tint (reserved, not currently used by a component but kept for future badges/hover states) |
| `--coral-700` | `#A8503F` | deep coral (reserved, not used as primary) |
| `--coral-100` | `#FBEAE5` | pale coral tint — accent/tag background |
| `--charcoal-900` | `#2B2725` | body text |
| `--charcoal-500` | `#5A5450` | muted/secondary text |
| `--border-200` | `#EDE4D6` | hairline borders on cream background |

**Semantic aliases** (mapped into Tailwind via `@theme inline`, consumed
via Tailwind utilities like `bg-primary`, `text-foreground`):

| Semantic token | Maps to |
|---|---|
| `--color-background` | `--cream-50` |
| `--color-surface` | white (card backgrounds sit one shade lighter than the page) |
| `--color-foreground` | `--charcoal-900` |
| `--color-muted-foreground` | `--charcoal-500` |
| `--color-border` | `--border-200` |
| `--color-primary` / `--color-primary-foreground` | `--mint-600` / white |
| `--color-accent` / `--color-accent-foreground` | `--coral-100` / `--charcoal-900` |
| `--color-focus-ring` | `--mint-600` (replaces today's placeholder blue) |

**Contrast verification** (WCAG 2.1 AA, computed via relative-luminance
formula; re-verified at runtime by the existing `@axe-core/playwright`
E2E scans since jsdom cannot evaluate rendered color contrast):

- Charcoal-900 body text on cream/white background: ≈14.8:1 (needs 4.5:1)
- White text on mint-600 buttons: ≈5.9:1 (needs 4.5:1)
- White text on coral-700 (if ever used as a filled surface): ≈5.4:1
- Charcoal-900 on coral-100 / mint-100 tints (badges): ≈13:1
- Mint-600 as a focus-ring / non-text UI indicator: ≈5.9:1 (needs 3:1)

Spacing and border-radius use Tailwind's existing default scale directly
(`rounded-lg`, `rounded-xl`, the default spacing scale) — no new tokens;
these aren't a re-theming concern the way color/type are.

## Typography

- `--font-display: 'Fraunces', serif` — headings (`h1`–`h3`, the "Kalia"
  wordmark), applied via a `font-display` utility class. Fraunces is a
  variable optical-size serif with a soft, slightly wonky character that
  reads as retro-craft rather than formal-editorial.
- `--font-sans: 'Inter', sans-serif` — body text and UI; replaces Geist
  Sans as the default everywhere.
- Geist Mono is dropped — nothing in the codebase uses a monospace font.
- Both loaded via `next/font/google` in `app/[locale]/layout.tsx`, exposed
  as CSS variables, wired into `@theme inline` — same mechanism Geist uses
  today, just swapping which fonts are requested. No new dependency.

## Shared UI primitives (new `frontend/components/ui/`)

Grounded in what the existing pages already do (not speculative):

- **`buttonVariants({ variant: "primary" | "outline" })`** — a pure
  function returning a Tailwind class string (the pattern shadcn/ui
  popularized; no new dependency, no `class-variance-authority` install).
  - `"primary"`: solid mint background / white text — replaces the
    ad hoc zinc classes on `SearchFilters`' submit button and the home
    page CTA link.
  - `"outline"`: bordered, transparent background — replaces
    `Pagination`'s prev/next link classes.
  - Consumed by a thin `<Button>` wrapper (native `<button>`, for the
    search form) **and** directly as a `className` on Next's `<Link>`
    (pagination is navigation, not a form submission — no need to coerce
    it through a button element).
- **`Badge`** — small pill `<span>`, `variant: "neutral" | "accent"`.
  - `"neutral"` (muted gray): the style label in `BeerList` (unchanged
    role, just re-tokenized).
  - `"accent"` (coral tint / charcoal text): the ABV badge — the one
    place a pastel shows up as a small highlight, matching the "sparse
    color" direction from the mockups.
- **`Card`** — presentational `<div>` providing the bordered/padded/
  rounded surface look only. Does **not** replace the semantic wrapper
  elements that already carry meaning or behavior — `BeerList`'s `<li>`
  (stretched-link, hover, `focus-within` ring) and `BeerDetailsCard`'s
  `<dl>` keep their own tags, layering `Card`'s classes on top via
  `className`.

Each primitive ships with a colocated test file and a `jest-axe`
assertion, per the existing convention. `components/ui/` is also the
seam the roadmap flags for a possible future design-system extraction —
self-contained today, movable to its own package later with no rework.

## Migration scope

Pure re-styling — no API, routing, or data-fetching changes.

| File | Change |
|---|---|
| `frontend/app/globals.css` | Token rewrite (above); dark-mode block removed |
| `frontend/app/[locale]/layout.tsx` | Fraunces/Inter instead of Geist; header/skip-link restyled |
| `frontend/app/[locale]/page.tsx` | Heading/CTA restyled; CTA → `buttonVariants({variant:"primary"})` |
| `frontend/app/[locale]/beers/page.tsx` | Heading restyle only |
| `frontend/app/[locale]/beers/[id]/not-found.tsx` | Token/font restyle only |
| `frontend/features/catalog/BeerList.tsx` | `Card` for item chrome; `Badge` (neutral: style, accent: ABV); `dark:` classes removed |
| `frontend/features/catalog/BeerDetailsCard.tsx` | `Card` for the stat panel |
| `frontend/features/catalog/SearchFilters.tsx` | Inputs re-tokenized; submit button → `Button` |
| `frontend/features/catalog/Pagination.tsx` | Prev/next links → `buttonVariants({variant:"outline"})` |
| `frontend/features/i18n/LocaleSwitcher.tsx` | Re-tokenized (still plain text links) |
| `frontend/components/ui/button.tsx` (+ test) | New |
| `frontend/components/ui/badge.tsx` (+ test) | New |
| `frontend/components/ui/card.tsx` (+ test) | New |

## Verification

- `npm run lint`, `npm test` (incl. `jest-axe` on new/changed components),
  `npm run build`, `npm run test:e2e` (existing `@axe-core/playwright`
  WCAG scans on catalog pages — the real, rendered contrast check).
- Manually run `docker compose up` and browse home/catalog/detail pages
  before calling the task done (project UI-verification rule).

## Documentation / doc-sync

- Add a "Design tokens & shared UI primitives" bullet to
  `frontend/README.md`'s Conventions section, alongside the existing
  TanStack Query/Zustand/etc. entries. A styling convention, not a new
  library/architecture choice — no new ADR, consistent with how the WCAG
  approach (iteration 2 task 7) was documented in README rather than an
  ADR.
- Re-check `docs/architecture.md` for visual-design descriptions of the
  old zinc/Geist look — none found; it documents structure, not visual
  design, so no change expected there beyond confirming this in the PR.
- Tick roadmap task 8 in `docs/roadmap.md`; re-verify iteration 2's "Done
  when" criteria once this and task 9 (standard loading/error/empty
  states) are both done.

## Out of scope

- Task 9 (standard loading/error/empty states) — separate roadmap task,
  not bundled here.
- A dark theme — explicitly dropped, not deferred to "later in this
  task"; would be a new decision if ever revisited.
- A JS/TS token pipeline or `class-variance-authority` dependency —
  YAGNI until an actual need (a second consuming app, a JS-side color
  read) appears.
