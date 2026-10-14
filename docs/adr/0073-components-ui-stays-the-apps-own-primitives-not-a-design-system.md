# ADR-0073: A design system would serve a consumer that will never exist, so `components/ui/` stays the web app's own primitives

- **Status:** accepted
- **Date:** 2026-10-11
- **Amended:** 2026-10-11 — `scripts/check-headings.mjs` now checks the heading
  rule; see the amended Consequences entry and "How the decision is followed"
- **Amended:** 2026-10-14 — the inventory's `card` row missed three users
  inside `components/ui/`, so `cardVariants` was kept as `surfaceVariants`
  rather than removed; see the note under the inventory

## Context

[ADR-0021](0021-design-tokens-ui-primitives.md) called `components/ui/` "the
extraction seam the roadmap flags for a possible future design system", and
the phrase was carried forward for five iterations without anyone deciding
whether the extraction should happen.
[Iteration 7.5](../tasks/iteration-7.5.md) is the first point at which it can
be answered from evidence: six surfaces have been laid out again against one
identity, and `components/ui/` has grown from three primitives to fifteen. The
product owner's framing was that this may well not be needed, and that the
answer should come from a conversation with evidence in hand rather than an
agent's assumption either way
([task 12](../tasks/iteration-7.5/12-do-we-need-a-design-system.md)).

"Design system" covers everything from a README to a versioned package with a
release process, so the question is what it would be here, and what is
actually going wrong that one would fix.

Three forces bear on that:

- **The second consumer is already scheduled, and it is native.** The
  [backlog](../tasks/backlog.md)'s mobile client is planned as iterations
  9–14, a React Native app. It cannot render a DOM component or read a CSS
  custom property. [Iteration 11](../tasks/iteration-11.md) plans one
  platform-neutral token source for both platforms, which is the revisit
  trigger ADR-0021 set for its JS token pipeline, and builds native primitives
  of its own. What the two platforms will share is tokens and design intent,
  never `components/ui/`.
- **The only people coordinated are one product owner and agents.** A design
  system usually exists to keep many people consistent. Here every screen is
  drawn by an agent whose context is discarded between sessions. The open
  question was whether that makes a written system more valuable or less.
- **YAGNI is this repository's default in exactly this area.** ADR-0021
  rejected a token pipeline as "tooling built years ahead of the need", and a
  yes here has to point at a need that exists.

## Decision

**`components/ui/` stays a folder of the web app's own primitives. Kalia
builds no design system, no shared component package and no rendered component
catalogue, and when a look recurs it becomes a primitive in that folder, not a
rule in a document.**

- **No package.** `components/ui/` does not move to `packages/` or anywhere
  else. The one consumer that is coming cannot render it, and a web-only
  package with one importer is a folder with a release process. The existing
  boundary, where `components/ui/` imports only from `lib/`, stays: it keeps
  the folder self-contained at no cost, though nothing is waiting to extract
  it.
- **No rendered catalogue.** No Storybook and no dev-only route that renders
  every primitive. The agents who write the screens read code, not rendered
  pages, and the product owner sees each design choice rendered already, as
  the `design-task` skill's Artifacts
  ([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)).
- **A recurring look is fixed in code.** When the same styling is written by
  hand in more than one feature, the fix is a primitive (or a shared class
  string exported from one) in `components/ui/`, and the hand-written copies
  are replaced by it. A row in a document saying which class string to use is
  not a fix. The evidence below is why: a rule written in
  [`docs/design.md`](../design.md) was broken a week later in the same
  iteration, and the rule the build checks was not.
- **Documentation keeps its current homes.** What a token or a visual element
  *means* stays in `docs/design.md`
  ([ADR-0063](0063-design-intent-has-its-own-document.md)). How to use
  `components/ui/` stays in the conventions in
  [`frontend/README.md`](../../frontend/README.md). Its shape stays in
  [`docs/architecture.md`](../architecture.md) §5. No component documentation
  is added, so there is nothing for `docs/design.md` to contain or be
  contained by. A primitive's props and variants are documented by its own
  source and colocated test.
- **The drift this inventory found is scheduled, not fixed here.** Two
  follow-up tasks are written, not started:
  [task 17](../tasks/iteration-7.5/17-one-title-and-one-heading-style.md) for
  page titles and section headings, and
  [task 18](../tasks/iteration-7.5/18-empty-states-and-sign-in-prompts-as-primitives.md)
  for empty states, the sign-in prompt and `Card`.

This decides nothing about tokens. Whether the token source becomes
platform-neutral, and in what format, is iteration 11's decision. That
question and this one get conflated, but they are different questions with
different triggers.

## Alternatives considered

**Extract `components/ui/` into a shared package** (`packages/ui`, with its own
README and version). This is what ADR-0021's "extraction seam" sentence
anticipated, and it is the conventional answer once a second client appears.
Rejected because the second client that has appeared is native, so the
package would have exactly one importer, the app it was taken out of.
Iteration 9's planned `packages/` directory is for what is genuinely shared,
and React components for the DOM are not.

**Document the primitives as a design system inside `docs/design.md`**: a
*Components* section with one row per primitive saying what it is for, kept in
step by a checker the way the token rows are. This was the strongest
alternative, because it answers "agents forget, documents do not" directly and
has one obvious home. Rejected on this iteration's evidence: `docs/design.md`
already said, from 2026-10-03, that a section heading takes `--text-heading`
in the display face. Four headings written on 2026-10-10 and 2026-10-11 took
`text-2xl font-bold` instead. An agent writing a screen reaches for what is
importable, not for a document it was not pointed at, so a primitive carries
the rule to every use and a document reaches only the uses whose author read
it. The meaning rows already in `docs/design.md` stay. This option would have
added a second description of what the code already says.

**A rendered component catalogue**, either Storybook or a dev-only route that
renders every primitive in every state. This is the one artefact the task
thought might have made the iteration easier on its own. Rejected because its
audience is a human browsing for a component to reuse, and that is not who
writes Kalia's screens. Storybook would also add a build and a large
dependency tree for the CVE scan
([ADR-0024](0024-dependency-vulnerability-scanning.md)). A dev-only route
avoids both but is a page that someone has to keep current, for a reader who
does not open it.

**Leave the question open, as ADR-0021 did.** This was the status quo.
Rejected because an open "possible future design system" is a question every
new component quietly re-asks, and the follow-up tasks below are only worth
writing once the answer says where a recurring look should go.

## Consequences

- Good, because a recurring look now has one place to go and one form to take,
  and the follow-up tasks turn what this inventory found into code a later
  screen cannot miss.
- Good, because nothing new is built or kept current: no package, no
  catalogue, no second document of components.
- Good, because the mobile client's design work in iteration 11 starts from a
  stated position: it shares tokens and `docs/design.md` with the web, not
  components, and builds its own primitives.
- Bad, because nothing checks the rule. A third copy of a hand-written heading
  fails no build. It is caught by review, or by the next inventory, which is
  how it went uncaught through four layout tasks. Task 17 is where a check for
  headings is proposed, if one is wanted.

  > **Amended 2026-10-11.** No longer true for headings: a literal `<h1>` or
  > `<h2>` in `frontend/app/` or `frontend/features/` fails
  > `scripts/check-headings.mjs`, so a page title comes from `PageTitle` and a
  > section heading from `SectionHeading`. A heading whose tag is chosen at
  > runtime is still review's to catch.
- Bad, because nobody, human or agent, can see every primitive in one place.
  Choosing between two similar ones means reading their source.
- Neutral, because ADR-0021's "extraction seam" sentence is now historical.
  The boundary that made the seam cheap stays, for its own sake rather than
  for an extraction.
- **Revisit trigger:** either of these, each a condition that interrupts work
  rather than waiting to be remembered:
  - *A second importer of `components/ui/` outside `frontend/`.* Iteration 9
    moves the app to npm workspaces, and an import from another workspace into
    `components/ui/` is the first time a shared package would have a second
    user. The import fails, or needs a workspace dependency someone has to add
    on purpose.
  - *Iteration 11's token-format decision.* Its entry in the iteration index
    links here, so the decision is taken with this ADR open. If the shared
    token source turns out to need shared component *contracts* across
    platforms as well (the same names, variants and states on both), that is a
    design system, and this ADR is reopened rather than worked around.

**How the decision is followed:** the existing ESLint layer boundaries in
`frontend/eslint.config.mjs` keep `components/ui/` importing only `lib/`, and
`scripts/check-token-styling.mjs`
([ADR-0066](0066-token-only-styling-is-a-build-check.md)) keeps colour and
typeface inside the token layer. What neither covers is a type role written by
hand. The check that would cover it is a lint or `scripts/` rule that a page's
`<h1>`, or a section's `<h2>`, outside `components/ui/` takes its classes from
the shared primitive. It is named here, not written: whether it earns its
place is task 17's question.

> **Amended 2026-10-11.** It was written, as `scripts/check-headings.mjs`, run
> by `make verify` and CI's heading check. Rather than inspect classes, it
> fails the hand-written element itself, with an allowlist naming each heading
> that is neither a page title nor a section heading.

## Evidence

**Inventory of `components/ui/`**, taken on 2026-10-11 at `7a98f29` (origin/dev
after PR #336). "Files" counts non-test `.tsx`/`.ts` files under `app/`,
`features/` and `lib/` that import the primitive. 484 lines of primitive
source in total, excluding tests.

| Primitive | Exports | Added | Files | Verdict |
|---|---|---|---|---|
| `button` | `Button`, `buttonVariants` | iteration 2 | 22 | Recurred: every action on every surface |
| `page` | `Page`, `shellFrame` | iteration 7.5 task 06 | 18 | Recurred: every route, its loading, error and not-found files, and the header and footer |
| `icon` | `Icon` | iteration 7.5 task 04 | 8 | Recurred across five features |
| `skeleton` | `Skeleton` | iteration 2 | 7 | Recurred: every route skeleton |
| `badge` | `Badge`, `badgeVariants` | iteration 2 | 5 | Recurred across catalog, cellar and feed |
| `person-slot` | `PersonSlot` | iteration 7.5 task 04 | 4 | Recurred across auth, profile, feed and cellar |
| `error-alert` | `ErrorAlert` | iteration 7.5 task 10 | 4 | Recurred: sign-up, both bottle dialogs, the feed |
| `beer-slot` | `BeerSlot` | iteration 7.5 task 04 | 3 | Recurred across catalog and cellar |
| `dialog` | `Dialog` and parts | iteration 5 | 3 | Recurred within the cellar only |
| `field` | `fieldClasses`, `FieldError` | iteration 7.5 task 10 | 3 | Recurred: sign-up and both bottle dialogs |
| `toast` | `Toast` and parts | iteration 5 | 2 | Shared by cellar and profile |
| `kalia-mark` | `KaliaMark` | iteration 7.5 task 04 | 2 | Shared by header and footer |
| `card` | `Card`, `cardVariants` | iteration 2 | 1 | **Looked shared, was not.** `Card` itself has no users; `cardVariants` is used in `FeedList` and inside `EmptyState`. The catalog stopped using it under [ADR-0069](0069-catalog-one-ruled-column-beside-a-filter-column-with-one-search-button.md) |
| `empty-state` | `EmptyState` | iteration 2 | 1 | One-off: the catalog's empty search, by agreement in ADR-0069. Its dashed, centred card predates the identity |
| `relative-time` | `RelativeTime` | iteration 7 | 1 | One-off: the feed |

> **Amended 2026-10-14** ([task 18](../tasks/iteration-7.5/18-empty-states-and-sign-in-prompts-as-primitives.md)): the `card` row counted
> importers outside `components/ui/` only, and so missed that `cardVariants`
> is also the surface of `Dialog`, `ErrorAlert` and `Toast`. It had recurred.
> `Card` was removed, and the classes moved to `components/ui/surface.ts` as
> `surfaceVariants`, which those three and `FeedList` import. The
> `empty-state` row is no longer a one-off: the catalog's empty search, both
> cellar views and the sign-in prompt render through it. The table below's
> empty state and sign-in prompt rows are primitives now, `EmptyState` and
> `SignInPrompt`, which the cellar and the profile fill with their own
> strings and Server Action.

**Recurring looks that are not primitives**, found by grouping identical
`className` literals across files and reading every `<h1>` and `<h2>` outside
`components/ui/`:

| Look | Where it is written by hand | What it shows |
|---|---|---|
| Page title, `font-display text-title font-extrabold text-balance text-foreground md:text-display` | Five times: `features/catalog/layout.ts`, `features/cellar/layout.ts`, and inline in the front page, profile and sign-up pages | Copied, not shared. It has stayed identical so far |
| Page title, `font-display text-3xl font-bold tracking-tight text-foreground` | `app/[locale]/error.tsx`, `app/[locale]/not-found.tsx` | The generic error and not-found pages were put in the shell by task 06, but their titles kept a size from before the identity that is not a token |
| Section heading, `text-2xl font-bold text-foreground` | `CellarView`, `PublicCellarView`, `features/cellar/SignInPrompt`, `features/profile/SignInPrompt`, last written 2026-10-10 and 2026-10-11 | Contradicts `docs/design.md`'s `--text-heading` row ("`h2`s that divide a page, in the display face"), written 2026-10-03. One `h2` in the app, in `VisibilityControl`, follows it |
| Empty state: heading, muted hint, action | `EmptyState` in the catalog; hand-built with a top rule in `CellarView` and `PublicCellarView` | Two looks for one job. The catalog's was kept by agreement in ADR-0069, and the cellar's was laid out new in [ADR-0070](0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md) |
| Sign-in prompt | `features/cellar/SignInPrompt.tsx` and `features/profile/SignInPrompt.tsx`, identical apart from their strings and Server Action | Features cannot import each other, so a second copy was the only route short of a primitive |
| Small label, `text-label font-semibold uppercase` | 13 files | Consistent, because `docs/design.md`'s `--text-label` row says it is always uppercase and semibold, and the classes are short enough to type. Not drift |

**Colour and typeface did not drift.** `scripts/check-token-styling.mjs`
reports no violation on the same commit, which held through all six layout
tasks because that check landed before them
([task 05](../tasks/iteration-7.5/05-token-only-styling-enforced.md)). The
contrast between the two kinds of rule, the one checked in the build holding
and the one written in a document not, is the evidence the rejected
documentation option turns on.
