# Task 14: Where Kalia's design intent lives

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-2

## Why

Three of the four things a redesign produces already have homes. The *values*
live in `app/globals.css` and nowhere else. The *shape* — two layers, semantic
aliases, primitives in `components/ui/` — lives in
[architecture.md §5](../../architecture.md). The *reasons* live in
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md). That is
[ADR-0020](../../adr/0020-documentation-roles.md)'s three homes doing their job.

The fourth thing has no home at all: **what Kalia is supposed to look and feel
like**, and what a future change is judged against. Today the closest thing to
it is a parenthesis inside an ADR's *Alternatives* section — "the product
owner's aesthetic direction (craft-label: serif display, sparse pastel)" — which
is a sentence explaining why an option was rejected, not a brief anyone could
design against.

[Task 03](03-visual-identity.md) is about to produce exactly that statement, and
five tasks after it are meant to be held against it. An ADR is the wrong
container: [ADR-0019](../../adr/0019-adr-format-and-conventions.md) says an
accepted ADR is amended rather than rewritten, which is right for a decision
made once and wrong for a brief that four later tasks add to.

**[`docs/glossary.md`](../../glossary.md) is the precedent, and it is a close
one.** It exists because "every line is written by an agent whose context is
discarded between sessions … so consistency has no carrier except a document."
That argument is not about domain vocabulary specifically — it is about any
shared language that lives only in code. A visual language is one, and the
glossary already proves this repository will accept a fourth document when the
three homes genuinely do not fit, will say so in the file itself ("this file is
not an ADR and does not earn one"), and will back the mechanical half with a
checker.

## Scope

One decision, recorded, and the document if the answer is yes: whether Kalia
has a standing design document; exactly what it holds and — more importantly —
what it must not, against the three existing homes; how it is kept true; and
which later tasks write which parts of it.

## Non-goals

- Writing Kalia's design into it. [Task 03](03-visual-identity.md) produces the
  identity, [task 04](04-imagery-iconography-and-the-mark.md) the imagery and
  mark, [task 06](06-page-shell.md) whatever layout principles turn out to be
  standing rather than per-page. This task decides the container and its rules.
- Deciding the design system.
  [Task 12](12-do-we-need-a-design-system.md) asks whether `components/ui/`
  becomes one; that is a question about code and its documentation, and
  conflating the two is how a design document turns into a component catalogue
  nobody maintains.
- Restating token values. `app/globals.css` is their one home and this document
  does not become a second — see question 3, which is the whole risk.
- Reopening [ADR-0020](../../adr/0020-documentation-roles.md)'s three-home rule
  as a rule. The glossary already established that a document outside the three
  can exist without overturning it; this is the second such case, not a new
  policy.

## Constraints

- **[ADR-0020](../../adr/0020-documentation-roles.md) is the bar this has to
  clear**, not a rule to work around: every other mention of a fact is a
  one-line pointer with a link. A design document that restates ADR-0021's
  reasoning, architecture.md §5's shape or globals.css's values has failed
  before it is written.
- The repository already has a live example of the failure mode.
  [Quality backlog](../quality-backlog.md) **SHOULD-20**: the Radix version
  pins and their rationale live in four places and have already drifted. A
  fourth documentation home is a fourth thing that can drift.
- **[`docs/glossary.md`](../../glossary.md) is the model to follow, including
  its self-discipline.** Its "How this file is kept current" section splits the
  file into a machine-checked half (`scripts/check-glossary.mjs`, bidirectional,
  with a fixture self-test because nothing in the real tree would otherwise trip
  it) and a review-maintained half, and says which is which. A design document
  without that section is a document that goes stale silently.
- [ADR-0035](../../adr/0035-agent-context-layout.md): anything an agent is
  expected to read costs context in the sessions that read it. Whether this
  document is loaded, linked, or merely findable is a real decision with a
  real price.
- **This lands before [task 03](03-visual-identity.md).** A task that produces
  the feel statement needs to know where it goes; deciding afterwards means
  moving it.

## Open questions

1. **Does it exist at all?** The honest alternative is that
   [task 03](03-visual-identity.md)'s ADR amendment carries the feel statement
   and nothing else is created. That is cheaper, keeps the three homes intact,
   and the cost is that a standing brief is buried in a decision record — which
   is exactly where today's one-line version is buried, and why it is not doing
   any work.
2. **What is in it?** Candidates: the feel statement and its reference points;
   what each semantic token *means* and when to reach for it; layout principles
   that are standing rather than per-page; what imagery and the mark are for;
   the two locales' typographic constraints. Some of these belong in
   `frontend/README.md` as conventions instead, and separating those is most of
   the work.
3. **Does it hold any values?** The strong recommendation is no — `globals.css`
   is their home. But "what `--color-accent` means and when to use it" is not a
   value, and it is genuinely homeless today. Where that line falls decides
   whether this document is useful or is SHOULD-20 repeating itself.
4. **Is any of it machine-checked?** The glossary's pattern maps directly:
   every semantic token in `globals.css` has a row saying what it means, checked
   bidirectionally, so a token added without an explanation fails the build and
   a row naming a token that no longer exists fails too. That would sit
   naturally beside [task 05](05-token-only-styling-enforced.md)'s checker and
   would make this the second document in the repository that cannot rot
   quietly.
5. **Who is it for?** Agents, the product owner, or a future contributor. The
   glossary answers "agents, because they forget"; if this document's answer is
   the same, its shape follows from that, and so does whether it is loaded into
   context.
6. **Is it named `docs/design.md`?** `architecture.md` §5 is already titled
   "Frontend design", and the [backlog](../backlog.md) already notes that the
   singular title is a problem once a second client exists. Two documents whose
   names both say "design" is a navigation problem on day one.
7. **What happens to it if [task 12](12-do-we-need-a-design-system.md) says
   yes?** A design system's documentation and a design brief overlap, and the
   answer should be that one contains the other rather than that both exist and
   disagree.

## Acceptance criteria

- [ ] An ADR records whether the document exists, what it holds, what it
      explicitly does not, and the rejected alternative of folding the brief
      into [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) — with at
      least one Bad or Neutral consequence, passing
      `node scripts/check-adrs.mjs`
- [ ] If it exists, it carries a "how this file is kept current" section naming
      which parts are checked and which are review-maintained, following
      [`docs/glossary.md`](../../glossary.md)
- [ ] If any part is machine-checked, the checker is bidirectional and ships a
      fixture self-test the way `scripts/check-glossary.test.mjs` does — because
      nothing in the real tree would otherwise trip it, and a check that never
      fires passes whether or not its condition is right
- [ ] No fact in it is also stated in
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md),
      `docs/architecture.md` §5, `frontend/README.md` or `app/globals.css` —
      each of those either points at it or is pointed at, and the PR says which
      way round for each
- [ ] Tasks [03](03-visual-identity.md), [04](04-imagery-iconography-and-the-mark.md),
      [06](06-page-shell.md) and [12](12-do-we-need-a-design-system.md) each
      have an acceptance criterion naming what they contribute to it, added in
      this task's PR — so the document is filled by the work rather than in one
      sitting afterwards
- [ ] `make verify` is green

## Notes

Requested by the product owner in review of
[PR #257](https://github.com/MiguelSombrero/kalia/pull/257) on 2026-09-12:
"should this sprint add new `docs/design.md` file that captures our design and
visual look?"

Written as a decision task rather than a "create the file" task, and scoped
deliberately narrower than that question. Capturing "our design and visual
look" as a whole would duplicate three documents that already work; what is
actually homeless is the brief — the intent a later change is judged against.
Question 1 keeps the wider reading available if the product owner wants it.

Placed third in the order of work rather than given a low ID, because IDs are
permanent ([the template](../template.md)) and this task was added after the
iteration was seeded.
