# Task 03: A new visual identity: colour, type, and the feel they make

- **Status:** done
- **Iteration:** [7.5](../iteration-7.5.md)
- **PR:** #313
- **Covers:** DW-2
- **Kind:** design

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
- **Where the feel statement goes is [task 14](14-where-design-intent-lives.md)'s
  decision, not this one's.** That task lands first precisely so this one does
  not have to invent a home for a brief that five later tasks are held against.
- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  amended, not rewritten. Replacing the palette
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) records is a large
  enough change that whether it amends or supersedes is itself a judgement to
  make deliberately.
- **How directions are built, shown, counted and recorded is
  [task 01](01-how-a-design-task-runs.md)'s `design-task` skill**, not this
  task's to decide: three directions in the first round, rounds open until the
  product owner is satisfied, and the choice recorded in this task's own ADR.
  This task is the skill's first real use, so it is also where the skill is
  corrected (acceptance criteria below).

- The agreed widths, the contrast check and the route back to the product
  owner on a contrast failure are iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **Everything is open.** Today's craft-label direction is not a starting
  point to refine, and Fraunces and Inter are not kept by default. Typefaces
  stay within Google Fonts, per the `next/font/google` constraint above.
- **Each round-one direction proposes its own feel.** Every direction arrives
  with a one-paragraph feel statement and the reference points behind it. The
  chosen direction's statement, edited by the product owner, becomes the brief
  in `docs/design.md` ([task 14](14-where-design-intent-lives.md)).
- **State colours are required:** at least a success and a destructive token,
  since the removal toast and the remove dialog already need them. How many
  accents there are, and whether radius, elevation or spacing get tokens, is
  decided by the chosen direction and recorded in this task's ADR. If that
  overturns [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s claim
  that spacing and radius are not re-theming concerns, the ADR says so in
  writing.
- **Both locales.** The mockups carry Finnish strings
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), and a
  type scale is judged against Finnish compounds as well as English
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- **This task builds the contrast check.** A dependency-free `scripts/`
  checker computes the WCAG relative-luminance contrast of the semantic
  pairings the app uses and fails the build below AA, so that the new palette
  lands already guarded rather than discovered late in Playwright. Where the
  list of pairings is declared is this task's to choose, beside `docs/design.md`'s
  token rows if that fits.

## Open questions

**None.**

## Acceptance criteria

- [x] At least three distinct directions were built and put in front of the
      product owner, as [task 01](01-how-a-design-task-runs.md) requires, and
      the one chosen is identifiable — not a blend assembled after the fact
- [x] Anything `design-task` got wrong when run here is fixed in the skill in
      this task's pull request rather than noted, and the PR says what changed
- [x] The chosen identity is recorded as an amendment to or replacement of
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md), stating the
      directions rejected and why, and passing `node scripts/check-adrs.mjs`
- [x] The feel the identity is meant to produce is written down where
      [task 14](14-where-design-intent-lives.md) decided it belongs, in a form
      a later task can be held against: [`docs/design.md`](../../design.md)'s
      *Feel* section holds the statement and its reference points, its
      *Semantic tokens* rows describe the new layer rather than iteration 2's
      (`node scripts/check-design-tokens.mjs` passes), and its *Typography
      across the two locales* section says what English and Finnish each
      demand of the type scale
- [x] Every colour pairing the app actually uses is computed against WCAG 2.1
      AA **before** the palette is committed, and the ADR's Evidence table
      lists the pairings and ratios that ship — not iteration 2's
- [x] A `scripts/` contrast checker fails `make verify` and CI when a declared
      pairing falls below AA, with a fixture test confirmed to fail before the
      checker existed
- [x] Success and destructive state tokens exist, and the removal toast and
      the remove dialog use them
- [x] `app/globals.css` and `app/[locale]/layout.tsx` are the only files
      carrying a colour or typeface value; no component references a primitive
      or a raw value
- [x] The existing `npm test` suites — including every `components/ui`
      colocated test and its `jest-axe` assertion — pass against the new
      tokens, and the Playwright `@axe-core/playwright` scans pass against
      every page that exists today
- [x] `docs/architecture.md` §5's visual-design bullet describes the identity
      that ships
- [x] `make verify` is green

## Notes

Iteration 2 task 8 is the precedent and worth reading before starting:
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence section
records the passes that produced today's palette, and its Alternatives section
records what was rejected and why. Reversing one of those rejections is allowed;
reversing it without noticing it was a decision is not.
