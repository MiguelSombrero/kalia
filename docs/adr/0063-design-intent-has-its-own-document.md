# ADR-0063: Kalia's design intent has its own document, which holds meaning and never values

- **Status:** accepted
- **Date:** 2026-10-03

## Context

[ADR-0020](0020-documentation-roles.md) gives each documented fact one home by
kind: ADRs hold *why*, `docs/architecture.md` holds *shape*, READMEs hold
*how*. Three of the four things a visual identity produces fit those homes.
The values live in `frontend/app/globals.css`, the two-layer token structure
in architecture.md §5, and the reasons in
[ADR-0021](0021-design-tokens-ui-primitives.md).

The fourth does not fit any of them: what Kalia is supposed to look and feel
like, and what a change is judged against. Today that brief is a parenthesis
in ADR-0021's *Alternatives considered* — "craft-label: serif display, sparse
pastel accents" — written to explain why an option was rejected, not as a
brief anyone could design against. Nothing says what a semantic token is
*for*, so an agent choosing between `--color-accent` and `--color-primary`
chooses by value, which is the indirection ADR-0021 exists to prevent.

Iteration 7.5 is about to make this acute. Task 03 produces a statement of
the feel the new identity is meant to have, and tasks 04, 06 and 12 each add
to it or are held against it. An ADR suits a decision made once. It does not
suit a brief that four later tasks add to:
[ADR-0019](0019-adr-format-and-conventions.md) has an accepted ADR amended,
not rewritten.

Two constraints bound the answer. A fourth documentation home is a fourth
thing that can drift, and the quality backlog's SHOULD-20 shows it happening:
the Radix version pins and their rationale sit in four places and already
disagree. And anything an agent is expected to read costs context in every
session that reads it ([ADR-0035](0035-agent-context-layout.md)).

## Decision

**Kalia's standing design intent lives in `docs/design.md`, a document
outside ADR-0020's three homes on [`docs/glossary.md`](../glossary.md)'s
model. It holds meaning and intent, never a value, and its token-meaning half
is checked by the build in both directions.**

- **What it holds:** the feel statement and the reference points behind it;
  what each semantic token means and when to reach for it; layout principles
  that hold on every page rather than one; what imagery and the Kalia mark are
  for; and what the English and Finnish locales each demand of typography.
- **What it never holds:** a value. A hex code, a typeface name or a size is
  a second copy of `globals.css` or `app/[locale]/layout.tsx`. It also never
  holds the token system's structure (architecture.md §5), the reasons behind
  a choice (that choice's ADR, linked from the section it shaped), or a rule
  for writing a component.
- **Where it meets `frontend/README.md`.** The README keeps what a developer
  applies mechanically while writing a component — for example, that a
  component references the semantic layer and never a primitive. `docs/design.md`
  keeps what needs judgement: which token a given element should use, and
  what the result should feel like. A sentence that a lint rule or checker
  could enforce is a README convention. A sentence a reviewer has to judge
  belongs in this document.
- **A semantic token is anything declared in one of `globals.css`'s `@theme`
  blocks**, inline or not, however many there are. Those blocks generate
  the Tailwind utilities components consume, so they are the layer a meaning
  is owed for. `scripts/check-design-tokens.mjs`
  fails when such a token has no meaning row, when one has more than one, and
  when a row names a token that no longer exists. It ships a fixture
  self-test, as `check-glossary.mjs` does, because nothing in the real tree
  would otherwise trip it. Every other section is review-maintained, and the
  file says so in its own "How this file is kept current" section.
- **Linked, not loaded.** Architecture.md §5, `frontend/README.md`'s token
  convention and the `design-task` skill point at it. Nothing imports it into
  every session.
- **Filled by the work that produces each part**, not in one sitting
  afterwards. Iteration 7.5 task 03 writes the feel, the token meanings for
  the identity it chooses, and the typographic constraints of the two
  locales. Task 04 writes imagery and the mark, and task 06 the layout
  principles. If task 12 makes `components/ui/` a design system, its ADR
  decides whether that system's documentation contains this file or the
  other way round. Each of those tasks carries an acceptance criterion naming
  its part.

This is the second document outside the three homes, not a new policy:
ADR-0020's rule stands, and the glossary established that a document outside
it may exist when the three genuinely do not fit and it says so in the file
itself.

## Alternatives considered

**Fold the brief into [ADR-0021](0021-design-tokens-ui-primitives.md)** or
into each design task's own ADR. ADR-0021 already holds the last brief, so
this needs no new document and no new checker. Rejected because an ADR records
a decision at a point in time, and ADR-0019 has an accepted one amended rather
than rewritten. A brief that tasks 03, 04, 06 and 12 each extend would become
a stack of dated amendments, and a reader would have to replay it to learn
the current intent. Splitting it across per-task ADRs is worse: the intent
exists only as the sum of documents nobody reads together.

**A section of `docs/architecture.md` §5.** That section is already titled
"Frontend design" and is where a reader looks first. Rejected because §5
holds *shape*, how the parts relate, and a feel statement is not shape.
Putting it there would also bring per-token meaning rows into a document
whose own rule is that it describes structure, not how to choose between
parts.

**`frontend/README.md`.** It is loaded automatically whenever an agent works
under `frontend/` ([ADR-0035](0035-agent-context-layout.md)), so the brief
would always be in context. Rejected because the README holds *how*, at a
one-line-per-convention bar ([ADR-0020](0020-documentation-roles.md)), and the
brief is neither. The automatic loading is a cost, not only a benefit: every
frontend session would pay for a design brief that most of them, fixing a
query hook or a Server Action, do not need.

**Loading it through a path-scoped `.claude/rules/` file** triggered by
`globals.css` or `components/`. Delivery would then be guaranteed rather than
relying on a link being followed ([ADR-0039](0039-mechanisms-for-recurring-rule-violations.md)).
Rejected for the same context cost, which here falls on every component edit,
and because ADR-0039 reserves that mechanism for rules agents break, not
briefs they consult. The product owner chose "linked, not loaded" in
refinement on 2026-10-01.

**Checking the whole document mechanically.** Rejected: only the
token-meaning half has a decidable condition. Whether a feel statement still
describes what ships is a reviewer's judgement, the same advisory tier
`scripts/check-comments.mjs` draws. A checker that judged it would be
guessing.

## Consequences

- Good, because a semantic token can no longer be added without a sentence
  saying what it means. The next agent to choose between two tokens chooses
  by meaning, not by value.
- Good, because later design tasks have one named brief to be held against,
  and a review can quote it, which a parenthesis in an ADR's alternatives
  could not support.
- Bad, because a fourth documentation home is a fourth thing that can drift.
  The checker covers only the token half, so a feel statement or a layout
  principle can go stale silently until a reviewer notices.
- Bad, because "linked, not loaded" means an agent that never follows the
  link restyles a page without reading the brief. Architecture.md §5, the
  README and the `design-task` skill all point at it, and that narrows the
  risk without removing it.
- Neutral, because the README/`design.md` boundary rests on a test, "could a
  checker enforce it?", that will occasionally put a sentence somewhere a
  reader did not expect. That is the same blurriness ADR-0020 accepts between
  shape and how.
- **Revisit trigger:** if
  [iteration 7.5 task 12](../tasks/iteration-7.5/12-do-we-need-a-design-system.md)
  makes `components/ui/` a design system with documentation of its own, the
  two documents resolve into one, and that task's ADR says which contains
  which.

## Evidence

When this document was created (`origin/dev` at `d547fb1`), `globals.css`
had one `@theme` block, `@theme inline`, declaring twelve tokens: ten
`--color-*` and two `--font-*`. `docs/design.md` was written with a meaning
row for each one, taken from how `app/`, `components/` and `features/`
actually use them rather than from intent. Three findings came out of that
survey and are reflected in the rows: `--color-primary` marks hover on
activatable elements as well as filling the main action, `--color-surface`
backs form fields as well as cards, and `--color-border`, faded, is the
loading skeleton's fill.

`node --test scripts/check-design-tokens.test.mjs` was run before
`check-design-tokens.mjs` existed and failed on the missing module. Once the
checker existed, its fixture cases passed and the real-tree case failed
until `docs/design.md` was written.
