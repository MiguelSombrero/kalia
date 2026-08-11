# Task 08: A ubiquitous language per bounded context

- **Status:** needs-refinement
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
- It must be written against whatever iteration 5
  [task 09](../iteration-5/09-bottle-beer-naming.md) decided, or after it. A
  glossary published with the names that task is in the middle of changing is
  drift created deliberately.
- Terms the backend publishes are not only Java type names. REST path
  segments, JSON field names and the generated frontend types
  ([ADR-0012](../../adr/0012-orval-api-client.md)) are the vocabulary a client
  actually meets, and they can drift from the Java names that produced them.

## Open questions

1. **Where does it live — `docs/architecture.md` §3, or its own document
   under `docs/`?** §3 is already the longest section in the file and the
   glossary grows with every module. A separate file is easier to scan and one
   more thing to keep linked.
2. **Is it checked, like ADRs and tasks are?** `check-adrs.mjs` and
   `check-tasks.mjs` exist because this project does not trust documents to
   stay in sync by good intentions. The mechanical version — every type in a
   backend `domain` package has an entry — is easy to write and may be noisy
   enough to be ignored, which is its own failure. The alternative is the
   doc-sync gate and nothing more.
3. **Does it bind user-facing copy?** The frontend's English and Finnish
   strings ([ADR-0011](../../adr/0011-i18next-localization.md)) are where a
   user meets the vocabulary, and a Finnish word for "bottle" applied to a can
   is the same collision one layer out — with the extra wrinkle that the two
   languages need not split the concepts the same way.
4. **Does adding a term become part of the doc-sync gate, and does
   [CLAUDE.md](../../../CLAUDE.md) gain a line?** CLAUDE.md is the only
   document loaded unconditionally, and it says a pointer there is one an
   agent never follows — which argues for a real line, and against, since the
   file is already long.
5. **Does the glossary cover the wire contract as well as the Java names?**
   The frontend generates its types from the OpenAPI spec, so the published
   names are a contract in their own right — and `EntryDto.quantity` is
   already a term (`quantity`) that exists nowhere in the schema.
6. **Does it record terms that were considered and rejected?** Iteration 5
   task 09 will produce at least one, and knowing a word was weighed and
   dropped is what stops the next session proposing it again.

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
- [ ] The glossary cannot silently fall behind: whichever mechanism open
      question 2 chooses, a test or check confirms it, and the confirmation
      was itself verified by removing an entry and watching it fail. If the
      answer to question 2 is "no checker", this criterion is replaced by the
      no-test exception recorded in Notes and the product owner accepts it
      explicitly
- [ ] `node scripts/check-adrs.mjs` and `node scripts/check-tasks.mjs` still
      pass, and any new check joins them in CI rather than being a command
      someone remembers to run

## Notes

Provenance: a Domain-Driven Design review of `backend/` on 2026-08-10, item 5
of its findings. Of everything the review proposed, this was the item it rated
highest value for this project specifically — not because the codebase needs
it more than others do, but because agent sessions lose their context and
documents are the only thing that survives the boundary.

If open question 2 is answered "no checker", this task produces documentation
and no automated test, taking the same deliberate exception to
[ADR-0026](../../adr/0026-task-file-format.md) that iteration 8
[task 01](../iteration-8/01-catalog-data-source.md) takes and
[task 07](07-cellar-domain-events.md) takes in this iteration. The exception
is worth naming rather than assuming, because a glossary with no check is
precisely the artifact this project's first goal says not to create.
