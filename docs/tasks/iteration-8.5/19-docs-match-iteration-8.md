# Task 19: The documentation says what iteration 8 built, once

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**The glossary contradicts the wire.** Its `cellar` table says of `beerId`
"Cellar responses never embed a `Beer` object" (`docs/glossary.md:157`), but
`EntryDto` and `PublicCellarEntryDto` carry a `CellarBeerDto beer` and no
`beerId` ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)),
and the vocabulary tables (`:153-174`) never name either. Its `ProfileRepository`
row (`:86`) explains a `findFirst…OrderByCreatedAtDesc` lookup that is now
`findByUsernameIgnoringCase` over a unique username
([ADR-0080](../../adr/0080-a-username-is-unique-regardless-of-case-and-never-reused.md)).
The glossary is what a second client's author reads first. It also restates
each module's dependencies (`:47`, `:78`, `:91-92`, `:107`), unguarded, and that
copy has already drifted from §3 (`docs/architecture.md:143`).

**Facts are stated in more than one home and the copies disagree**
([ADR-0020](../../adr/0020-documentation-roles.md)):

- the Radix rationale four times (`README.md:212-216`,
  `frontend/README.md:294-303` — which names only "the removal outcome toast",
  though `JustAdded.tsx` and `VisibilityControl.tsx` use it too —
  `docs/architecture.md:593-596` and ADR-0021);
- the per-issue Definition of Done twice (`docs/roadmap.md:38-48`, a subset at
  `docs/architecture.md:854-855`);
- the sign-up limit "20 per 10 minutes" four times, consistent today;
- the catalog's size three times, inconsistently (`docs/architecture.md:54` and
  `:167-168`, ADR-0078:19);
- base-image tags and Gmail quota figures in `README.md:254-272`;
- `docs/ci-playbook.md` restating fixes its header says it only points to
  (`:181-187`, `:212-221`), and `postgres:18.4` pinned in
  `docs/architecture.md:868` prose.

**Statements gone stale:** the README's feature list stops at iteration 9
(`README.md:143-146`), not saying mobile becomes the primary UI; "Repository
layout (planned)" describes a built tree and omits seven files and
directories (`:280-298`); `jose` is missing from the tech stack; "next 16.3.3 …
worth re-testing" (`:228-234`, next is 16.4.1); "CI … on every push" (`:276`);
"five" `AUTH_*` values where there are six (`frontend/README.md:30`);
§5's "server components call `kaliaFetch` directly" (`docs/architecture.md:518-519`);
the ADR index's ADR-0021 gloss, auth-group count, `useCellarBottles` and
ordering (`docs/adr/README.md:162-164`, `:190-193`, `:213`, `:218`); accepted
ADRs citing the removed store and "publishes only Next.js" with no amendment
(ADR-0002, ADR-0003, ADR-0007); stale counts in the 7.5 and 6.5 indexes;
"five containers" (`docs/ci-playbook.md:87`); and five stale items in
`docs/tasks/backlog.md` — likes "once the feed exists", `app/api/` "only
Auth.js's own routes", the import-boundary fixture iteration 8 delivered, the
"oldest vintage" deferral ADR-0083 removed the reason for, and a mobile section
written before iterations 9–14 were scheduled.

The front page also keeps its pitch and empty-state markup in the route file
(`app/[locale]/(home)/page.tsx:47-128`), against "`app/` route files stay
thin and delegate".

## Scope

Every statement above says what is true, and each duplicated fact has one
home with one-line pointers elsewhere, as ADR-0020 sets. The front page's
markup lives in its feature.

## Non-goals

- Documentation for anything this iteration's other tasks change — each task
  carries its own doc-sync.

## Constraints

- [ADR-0020](../../adr/0020-documentation-roles.md): ADRs hold *why*,
  `docs/architecture.md` *shape*, READMEs *how*; versions live in manifests.
  Exception: a rule whose violation fails silently keeps its warning inline.
- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  amended, never rewritten; a frozen ADR title keeps its wording.
- Task files of done tasks are frozen apart from status; iteration-index prose
  may be corrected.

**Decided at refinement, 2026-10-24** (product owner):

- **The Radix rationale lives in [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md).** The README, `frontend/README.md` and `docs/architecture.md` point at it in one line; `frontend/README.md` keeps only the silent-failure warning inline.
- **The sign-up limit lives in the code constant and ADR-0055**, and `frontend/README.md` keeps its e2e-budget warning as an inline trap; the playbook points at the README.
- **The catalog's size lives in ADR-0078 only**, as the measurement it is; `docs/architecture.md` points at it.
- **The README drops the base-image tags and the Gmail quota figures**, naming the technologies only.

## Open questions

**None.**

## Acceptance criteria

- [ ] `ArchitectureDocumentationTest` and `node scripts/check-links.mjs` are
      green after the edits
- [ ] The glossary's cellar and profile rows match `EntryDto`,
      `PublicCellarEntryDto` and `ProfileRepository`, and its module rows point
      at §3
- [ ] Each fact listed under "stated in more than one home" has exactly one
      home, checked by grepping for it
- [ ] The front page route delegates to a feature component, its vitest test
      moves with it, and `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-17, SHOULD-62,
SHOULD-20, SHOULD-53, SHOULD-55, COULD-22, COULD-23, COULD-24, COULD-25,
COULD-38, COULD-39, COULD-42, COULD-43, COULD-44, COULD-45, COULD-46, COULD-47,
COULD-48, COULD-50, COULD-69, COULD-70, COULD-71 and COULD-72. One task,
because each is a statement corrected or a duplicate collapsed, reviewable as
one sweep. MUST-17 is a MUST, so the glossary goes first.
