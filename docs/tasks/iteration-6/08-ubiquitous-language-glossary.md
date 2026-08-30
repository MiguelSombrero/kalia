# Task 08: A ubiquitous language per bounded context

- **Status:** refined
- **Iteration:** [6](../iteration-6.md)

## Why

The same English word means different things in different modules, and no
document says which. `catalog.Beer` names a brand; the physical thing a person
owns is a `cellar.Bottle`, which may be a can. That is not a bug — one word
legitimately meaning different things in different contexts is normal, and
sometimes the honest model — but which meaning belongs to which module has to
be readable somewhere, and today it is readable only by reading the code.

Iteration 5 [task 09](../iteration-5/09-bottle-beer-naming.md) exists because
that collision was found in a review rather than in a document, after the
names had already been carried into REST paths, the OpenAPI schema and the
generated frontend types — which is what makes it expensive to correct.

This iteration adds another batch of terms with nowhere to record them:
profile, visibility, public cellar, and whatever ends up identifying a user to
strangers ([task 01](01-profile-and-visibility.md), open question 2). And this
project has a specific exposure to the problem: every line here is written by
an agent whose context is discarded between sessions
([README.md](../../../README.md) roles), so vocabulary consistency has no
carrier except a document. A human team keeps its ubiquitous language partly
in its heads. This one cannot.

## Scope

A glossary organised by module: the terms each one owns, what each means
*inside that module*, and every case where a word deliberately means something
else next door. Plus the rule that keeps it current when a module gains a
term, since a glossary that falls behind the code is worse than none — it is
confidently wrong.

## Non-goals

- Renaming anything. Iteration 5
  [task 09](../iteration-5/09-bottle-beer-naming.md) owns the `Bottle`/`Beer`
  decision; this records whatever it decided and does not reopen it.
- A domain model diagram, an ER diagram, or anything that duplicates
  [architecture.md §3](../../architecture.md)'s data model sketch.
- Restating why a term means what it means. That lives in the ADR that decided
  it ([ADR-0020](../../adr/0020-documentation-roles.md)); a glossary entry is a
  meaning and a link.

## Constraints

- One home per fact ([ADR-0020](../../adr/0020-documentation-roles.md)). The
  glossary holds terms and meanings; anything explaining *why* stays in its
  ADR and is linked, not summarised.
- **This is documentation of decisions already made, not a new decision**, so
  it does not earn an ADR of its own by
  [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s test — unless
  the answer to open question 2 turns the maintenance rule into one.
- Iteration 5 [task 09](../iteration-5/09-bottle-beer-naming.md) was **dropped
  on 2026-08-15**: `cellar.Bottle` stays, `catalog.Beer` stays, and the
  `Bottle`/`ContainerType.BOTTLE` overlap was judged not worth a rename. There
  is nothing here waiting on it — the glossary records that pair of meanings
  as the live convention, and the rejected rename as its first rejected term.
- **It lives in its own `docs/glossary.md`**, with a one-line pointer from
  `architecture.md` §3. §3 is already the longest section in that file and the
  glossary grows with every module; a table that long inside a design document
  buries the design.
- **`scripts/check-glossary.mjs` runs in CI**, beside `check-adrs.mjs` and
  `check-tasks.mjs`, failing when a type in a backend `domain` package has no
  entry — and unlike its two siblings it carries a fixture-driven self-test,
  because this check's condition is one nothing in the tree would otherwise
  trip. **`CLAUDE.md` gains no line:** a failing check is the reminder, and
  that file is already past its own 200-line budget, so a bullet would cost
  context in every session to say what the build says for free.
- **It covers three things:** every Java `domain` type with its meaning inside
  its own module; the published vocabulary a client actually meets — REST path
  segments, JSON field names, generated TypeScript types
  ([ADR-0012](../../adr/0012-orval-api-client.md)) — because those drift from
  the Java names that produced them, and `EntryDto.quantity` is already a term
  appearing nowhere in the schema; and terms weighed and dropped, so the next
  session does not re-propose them.
- **It does not cover the en/fi user-facing strings**, with a line saying so
  and why: the two languages need not split the concepts the same way, which
  makes it a translation-policy question belonging with
  [ADR-0011](../../adr/0011-i18next-localization.md) rather than a glossary
  entry.
- The event-naming rule [task 07](07-cellar-domain-events.md) settles —
  past participle on the thing that changed, never repeating the module name —
  is a term rule and belongs here; its reasoning stays in that task's ADR and
  is linked, not summarised.
- Terms the backend publishes are not only Java type names. REST path
  segments, JSON field names and the generated frontend types
  ([ADR-0012](../../adr/0012-orval-api-client.md)) are the vocabulary a client
  actually meets, and they can drift from the Java names that produced them.

## Open questions

**None.**

## Acceptance criteria

- [ ] Every type in every backend `domain` package has an entry giving its
      meaning inside its own module — a type with no entry is the failure this
      is meant to make visible
- [ ] Each entry says which module owns the term, and every word that means
      two things across modules is named as such, with `Beer` and `Bottle`
      covered at minimum
- [ ] The terms this iteration introduces — profile, cellar visibility, public
      cellar, and the user-facing identifier from
      [task 01](01-profile-and-visibility.md) — are in it, so the glossary
      starts current rather than starting behind
- [ ] The published vocabulary is covered as well as the Java names — REST
      path segments, JSON field names and generated TypeScript types, with
      `EntryDto.quantity` among them as a term the schema does not contain
- [ ] Terms weighed and dropped are recorded, iteration 5
      [task 09](../iteration-5/09-bottle-beer-naming.md)'s rejected
      `Bottle`/`Beer` rename among them, and the event-naming rule from
      [task 07](07-cellar-domain-events.md) is in it as a term rule
- [ ] `scripts/check-glossary.mjs` fails when a type in a backend `domain`
      package has no entry, proven by a test running it against a fixture
      glossary with an entry removed — a check nothing ever trips passes
      whether or not its condition is right, which is why
      `ArchitectureRulesRejectViolationsTest` exists on the backend side
- [ ] `node scripts/check-adrs.mjs` and `node scripts/check-tasks.mjs` still
      pass, and any new check joins them in CI rather than being a command
      someone remembers to run

## Notes

Provenance: a Domain-Driven Design review of `backend/` on 2026-08-10, item 5
of its findings. Of everything the review proposed, this was the item it rated
highest value for this project specifically — not because the codebase needs
it more than others do, but because agent sessions lose their context and
documents are the only thing that survives the boundary.

Refined 2026-08-30 with iteration 6 as a batch
([ADR-0047](../../adr/0047-refinement-is-batched-per-iteration.md)). The
checker was chosen, so this task takes **no** exception to
[ADR-0026](../../adr/0026-task-file-format.md)'s one-automated-test rule —
unlike [task 07](07-cellar-domain-events.md) and iteration 8
[task 01](../iteration-8/01-catalog-data-source.md), which do. A glossary with
no check is precisely the artifact this project's first goal says not to
create, which is what settled it.
