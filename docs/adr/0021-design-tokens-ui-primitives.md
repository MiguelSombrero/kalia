# ADR-0021: Two-layer CSS design tokens and three shared UI primitives, no new dependency

- **Status:** accepted
- **Date:** 2026-07-27
- **Amended:** 2026-08-22 — the no-new-dependency rule now has one
  exception, `@radix-ui/react-dialog`, for the modal primitive's focus
  management (iteration 5 task 13)

## Context

The app's visual identity was Tailwind defaults: zinc grayscale, Geist fonts,
and ad hoc utility classes repeated per component. Each new feature restyled
itself, so the look drifted per page and a re-theme would have meant editing
every component.

Two things had to be settled together. What the identity *is* — a decision
belonging to the product owner, not derivable from the code — and where it
*lives*, so later features inherit it rather than reinventing it.

The constraint shaping the second half: Tailwind v4 already uses a CSS-first
configuration in `app/globals.css`, and the project's dependency rule
(`CLAUDE.md`) treats every new library as something to justify rather than
assume.

This ADR is written after the fact. The design spec
(`docs/superpowers/specs/2026-07-23-ui-design-design.md`) explicitly decided
*against* an ADR, reasoning that this was "a styling convention, not a new
library/architecture choice." [ADR-0020](0020-documentation-roles.md) reversed
that: the README bullet holding these decisions had grown to thirteen lines,
well past the one-line bar READMEs are held to, and the rejected options below
were recorded nowhere.

## Decision

**The visual identity is a two-layer CSS custom-property token system in
`app/globals.css` plus three shared primitives in `components/ui/`, built with
no new dependency.**

- **Two layers, and components may only reference the second.** Raw
  primitives (`--mint-600`, `--cream-50`, `--charcoal-900`) carry values;
  semantic aliases (`--color-primary`, `--color-background`,
  `--color-foreground`) carry meaning and are what components consume, via
  Tailwind utilities. A future re-theme touches the semantic layer only —
  that separation is the entire point of the indirection.
- **CSS-first, through Tailwind v4's `@theme inline`.** No
  `tailwind.config.ts`, no JS token pipeline. This follows the pattern already
  in the file rather than introducing a second mechanism alongside it.
- **Typography is Fraunces (display/headings) + Inter (body/UI)**, loaded via
  `next/font/google` in `app/[locale]/layout.tsx` and exposed as CSS
  variables — the same mechanism Geist used, requesting different fonts. Geist
  Mono is dropped; nothing uses a monospace font.
- **Light mode only.** The `prefers-color-scheme: dark` branch and every
  `dark:` variant are removed rather than adapted. This is a dropped option,
  not a deferred one — see Alternatives considered.
- **Three primitives in `components/ui/`:** `Button`/`buttonVariants`,
  `Badge`, and `Card`/`cardVariants`. Variant selection is a pure function
  returning a Tailwind class string, composed by a local `cn()` helper
  (`lib/cn.ts`).
- **`Card` provides surface appearance, never semantics.** It does not
  replace wrapper elements that already carry meaning or behaviour —
  `BeerList`'s `<li>` (stretched link, hover, `focus-within` ring) and
  `BeerDetailsCard`'s `<dl>` keep their own tags and layer `Card`'s classes
  on via `className`. A primitive that swallowed those would trade
  accessibility for tidiness.
- **`components/ui/` is the extraction seam** the roadmap flags for a possible
  future design system: self-contained today, movable to its own package later
  without rework.

Spacing and border-radius deliberately use Tailwind's default scale with no
new tokens — unlike colour and type, they are not a re-theming concern.

> **Amended 2026-08-22.** **`components/ui/dialog.tsx` is the one primitive
> built on a third-party dependency — `@radix-ui/react-dialog` 1.1.23 —
> because a modal's accessibility is behaviour, not styling.** The
> no-new-dependency rule above stands for everything else in
> `components/ui/`, and this exception does not widen to a component library:
> Radix is headless, so the dialog is still styled entirely with the semantic
> tokens above, and only the `Dialog` primitive may import it.
>
> What it buys is the part that cannot be expressed as a class string: a focus
> trap, focus restored to the trigger on close, `Escape` to dismiss,
> `aria-modal` with the rest of the page inert, and scroll locking. That is
> the WCAG 2.1 AA dialog contract this project holds itself to, and every item
> in it fails silently — the dialog looks correct while being unusable by
> keyboard or screen reader.

## Alternatives considered

**A JS/TS token pipeline** (tokens defined in TypeScript, generated into CSS).
The standard answer once tokens are shared across platforms, and it would let
JavaScript read a colour value. Rejected as tooling built years ahead of the
need: Kalia is one app at the preliminary-design stage, and nothing in it
reads a colour from JS. Revisit only if a second consuming app appears or a
genuine JS-side colour need arises.

**`class-variance-authority`, `clsx` and `tailwind-merge`** — the conventional
trio for exactly this variant pattern, and what shadcn/ui uses. Rejected
because a pure function returning a class string covers all three primitives'
needs in a few lines, and the project's dependency rule asks what a library
buys before adding it. The cost is real and accepted: `cn()` does not
de-duplicate conflicting Tailwind classes the way `tailwind-merge` does.

**A dark theme.** Explicitly dropped rather than deferred. The palette is a
light-mode design — warm cream with charcoal text and sparse pastel — and a
dark variant would be a different design, not a translation of this one.
Recorded as a decision so that adding one later is understood as new design
work rather than finishing something left half-done.

> **Amended 2026-08-22**, for the dialog dependency: **hand-writing the
> modal** in the same no-dependency spirit as the three primitives above.
> Consistent with this ADR as written, and the reason the question was asked
> at all. Rejected because the primitives it would sit beside are pure
> presentation — a class string and a wrapper element — whereas a dialog is
> focus management, and the failure mode differs in kind: a wrong class is
> visible on the page, a missing focus trap is invisible to the person who
> wrote it and total for someone navigating by keyboard. `cva`/`clsx` were
> declined below because a few lines covered what they did; that argument
> does not carry over, because a few lines do not cover this.

**Keeping Tailwind defaults and styling per component.** The status quo.
Rejected because it had already produced per-page drift, and because the
product owner's aesthetic direction (craft-label: serif display, sparse
pastel accents) cannot be expressed as defaults.

## Consequences

- Good, because a re-theme now touches the semantic token layer rather than
  every component, and new features inherit the identity by using the
  primitives instead of choosing colours.
- Good, because the whole system adds zero dependencies, so there is nothing
  to keep up to date and no upgrade that can change how a button looks —
  with the single 2026-08-22 exception below.
- Bad, because `cn()` is a naive concatenation: passing two conflicting
  Tailwind classes leaves both in the output, and the last one in source
  order wins rather than the last one passed. `tailwind-merge` exists to
  solve exactly this, and was declined — so composing variants with
  overriding `className` needs care.
- Bad, because contrast ratios are verified by computation and by E2E scans,
  not at unit-test time: jsdom cannot evaluate rendered colour, so a token
  change that breaks contrast fails only in Playwright, later than a
  developer would like.
- Neutral, because dropping dark mode means the app ignores
  `prefers-color-scheme` entirely, which some users will read as an
  oversight rather than a choice.
- **Revisit trigger:** a second consuming app, or a JS-side need to read a
  token value — either would reopen the JS-pipeline question that YAGNI
  settles today.

> **Amended 2026-08-22**, for the dialog dependency:
>
> - Good, because the modal's keyboard and screen-reader contract is
>   maintained upstream rather than being this project's to get right and
>   keep right, and `components/ui/dialog.tsx` stays a thin styled wrapper.
> - Bad, because "no new dependency" is no longer literally true of
>   `components/ui/`, so the bar for the next such request is now a judgement
>   about behaviour-versus-presentation rather than a flat no. The line drawn
>   here: a primitive that only *looks* a certain way stays hand-written.
> - Bad, because Radix pulls a subtree of its own packages
>   (`react-dismissable-layer`, `react-focus-scope`, `aria-hidden`,
>   `react-remove-scroll` among them) into the lockfile, widening the surface
>   the CVE scan watches ([ADR-0024](0024-dependency-vulnerability-scanning.md))
>   well past the one package named here.
> - Neutral, because the dialog is now the app's first component whose
>   accessibility is not verifiable by reading its own source.

## Evidence

**Contrast was computed against WCAG 2.1 AA before the palette was
committed**, using the relative-luminance formula, and is re-verified at
runtime by the existing `@axe-core/playwright` E2E scans:

| Pairing | Ratio | Needs |
|---|---|---|
| Charcoal-900 body text on cream/white | ≈14.8:1 | 4.5:1 |
| White text on mint-600 buttons | ≈5.9:1 | 4.5:1 |
| White text on coral-700, if ever used filled | ≈5.4:1 | 4.5:1 |
| Charcoal-900 on coral-100 / mint-100 badge tints | ≈13:1 | 4.5:1 |
| Mint-600 as focus ring (non-text indicator) | ≈5.9:1 | 3:1 |

**The palette was chosen with the product owner through iterative mockups**,
not proposed whole: palette comparison → restrained/whitespace pass →
background-tint comparison → primary-colour assignment → font-pairing
comparison. The resulting values are background `#FAF3E9`, primary `#2F6F5E`,
accent `#FBEAE5`, text `#2B2725` with `#5A5450` muted.

**The primitives were grounded in what the pages already did**, not designed
speculatively: `buttonVariants({variant:"primary"})` replaced the ad hoc zinc
classes on `SearchFilters`' submit button and the home CTA;
`{variant:"outline"}` replaced `Pagination`'s prev/next classes; `Badge`'s two
variants matched the existing style label and ABV badge. Each primitive ships
with a colocated test and a `jest-axe` assertion.
