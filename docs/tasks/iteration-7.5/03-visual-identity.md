# Task 03: A new visual identity: colour, type, and the feel they make

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-2

## Why

Kalia's identity was chosen in iteration 2, for a different product. At the
time the app was a beer catalog: a list, a detail page, a search form. Since
then it has grown a personal cellar, a profile, a cellar that strangers can
open by link, and a front page that changes while you watch it. The palette has
never been looked at again against what the product became, and the product
owner's judgement is that it should be more attractive and more modern.

That judgement is reason enough — the vision is the product owner's — but the
vocabulary is thin in ways that are measurable rather than aesthetic.
`app/globals.css` holds seven primitives and ten semantic aliases. There is one
accent and it is a single tint, used for badges. There is no elevation, no
state colour for success or failure even though the removal toast reports both,
no scale behind `--mint-600` beyond one 100-level tint, and no type scale —
Fraunces appears at one display size and everything else is Inter at Tailwind
defaults. That was proportionate for three primitives and two pages. It is thin
for a product with six surfaces and a feed.

[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) also made a claim
worth testing now rather than inheriting: spacing and border-radius
"deliberately use Tailwind's default scale with no new tokens — unlike colour
and type, they are not a re-theming concern." A redesign that changes how
things feel, and not only what colour they are, is exactly the evidence that
either confirms that claim or overturns it.

## Scope

The identity itself, arrived at by prototyping alternatives and chosen by the
product owner: the colour palette, the typography, and a statement of the feel
they are meant to produce that a later task can be held against. Then the token
layer that carries it — which semantic slots exist, what each means, and what
`app/globals.css` contains afterwards.

Whatever is chosen is applied to the token layer and to the three primitives in
`components/ui/`; the six surfaces are the tasks that follow.

## Non-goals

- Laying out any page. [Tasks 06](06-page-shell.md)–[10](10-profile-and-sign-up-layout.md)
  own that, and they inherit whatever this task decides.
- Imagery, icons and the Kalia mark —
  [task 04](04-imagery-iconography-and-the-mark.md), deliberately separate
  because one is a token layer and the other is an asset question with a
  dependency in it.
- The Keycloak pages. They are a second origin with their own stylesheet and
  they are [task 11](11-keycloak-pages-carry-the-identity.md).
- Dark mode. [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) dropped
  it as a decision and the product owner chose on 2026-09-12 not to reopen it
  here; the iteration index records that.
- A JS/TS token pipeline.
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) rejected it with a
  revisit trigger — a second consuming app, or a JS-side need to read a token —
  and neither has fired. The [backlog](../backlog.md)'s mobile-client entry is
  where it reopens.

## Constraints

- **The two-layer rule is not being reopened**
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)): raw primitives
  carry values, semantic aliases carry meaning, and components may reference
  only the second. A new palette changes what is in the layers, not that there
  are two.
- **CSS-first, through Tailwind v4's `@theme inline`** in `app/globals.css`. No
  `tailwind.config.ts` and no second mechanism alongside it.
- Fonts load through `next/font/google` in `app/[locale]/layout.tsx` and are
  exposed as CSS variables. A typeface that is not on Google Fonts is a
  different mechanism and a licensing question, not a drop-in swap.
- **Contrast fails late.** `jsdom` cannot evaluate rendered colour, so a token
  that breaks WCAG 2.1 AA passes every unit test and fails only in Playwright —
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) names this as a Bad
  consequence. Contrast has to be computed before a palette is committed, the
  way iteration 2 did it, not discovered afterwards.
- Any new dependency — a typeface package, a colour library — is a product
  owner question under `CLAUDE.md`'s "ask, don't research" rule, batched into
  refinement.
- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  amended, not rewritten. Replacing the palette
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) records is a large
  enough change that whether it amends or supersedes is itself a judgement to
  make deliberately.

## Open questions

1. **Is the current direction a starting point or is everything open?** The
   craft-label direction — warm cream, serif display, sparse pastel — was
   chosen deliberately and could be refined rather than replaced. "More modern
   and attractive" is compatible with both, and which one is being asked for
   changes what gets prototyped.
2. **What should Kalia feel like, in words?** The written answer is what a
   prototype is judged against and what stops "modern" meaning whatever the
   last thing anyone looked at was. Reference points — products, labels,
   magazines, anything the product owner can point at — are worth more here
   than adjectives.
3. **Do Fraunces and Inter survive?** They are a defensible pairing and the
   product owner picked them from a comparison. Changing them is the single
   biggest lever on "modern"; keeping them and changing everything else is also
   a real answer.
4. **Does the palette need state colours?** Success, warning and destructive
   have no tokens today, and the removal toast already reports success and
   failure, and the remove dialog is already a destructive action. They are
   being expressed with something; it is worth deciding what.
5. **Is one accent enough?** A feed, a profile and a public cellar are three
   contexts that may want to be visually distinguishable, and there is one
   accent tint today.
6. **Are spacing, radius and elevation re-theming concerns after all?**
   [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) says no. If the
   chosen direction needs a rounder or flatter or more layered feel, the answer
   changes, and it should change in writing rather than by a task quietly
   adding tokens.
7. **How many directions, and how are they shown?**
   [Task 01](01-how-a-design-task-runs.md) answers this in general; this task
   is the first to need the answer, so it is the one that finds out whether it
   works.
8. **Does the identity have to work in both locales?** Finnish and English set
   differently — Finnish words are longer and compound — and a type scale or a
   button sized around English is a thing that breaks in Finnish only
   ([ADR-0011](../../adr/0011-i18next-localization.md)).

## Acceptance criteria

- [ ] At least the agreed number of distinct directions were built and put in
      front of the product owner, and the one chosen is identifiable — not a
      blend assembled after the fact
- [ ] The chosen identity is recorded as an amendment to or replacement of
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md), stating the
      feel it is meant to produce and the directions rejected, and passing
      `node scripts/check-adrs.mjs`
- [ ] Every colour pairing the app actually uses is computed against WCAG 2.1
      AA **before** the palette is committed, and the ADR's Evidence table
      lists the pairings and ratios that ship — not iteration 2's
- [ ] `app/globals.css` and `app/[locale]/layout.tsx` are the only files
      carrying a colour or typeface value; no component references a primitive
      or a raw value
- [ ] The existing `npm test` suites — including every `components/ui`
      colocated test and its `jest-axe` assertion — pass against the new
      tokens, and the Playwright `@axe-core/playwright` scans pass against
      every page that exists today
- [ ] `docs/architecture.md` §5's visual-design bullet describes the identity
      that ships
- [ ] `make verify` is green

## Notes

Iteration 2 task 8 is the precedent and worth reading before starting:
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence section
records the passes that produced today's palette, and its Alternatives section
records what was rejected and why. Reversing one of those rejections is allowed;
reversing it without noticing it was a decision is not.
