# Task 16: The documentation describes what is built

- **Status:** done
- **Iteration:** [8](../iteration-8.md)

## Why

The project's first goal is that documentation and implementation never drift
apart (`CLAUDE.md`). The 2026-10-14 sweep found these places where they have,
each ready to fix as written. Some would mislead a contributor into wrong
work. Others are claims a reader cannot trust.

**Claims a contributor would act on:**

- **Brewery is listed as a built search filter** (`README.md:124`,
  `docs/architecture.md:26`), but the UI has never offered one, and
  `BeerSpecifications.java:28-31` matches `query` against the beer name only.
  ADR-0069:169 calls a brewery filter future work. The same class as retired
  MUST-7. *(MUST-12)*
- **Iteration 9 schedules work that is already done.** `iteration-9.md:69-70`
  plans "`/breweries` paginated (quality backlog COULD-4)", and
  `backlog.md:292-294` says the endpoint "returns the whole table
  unpaginated". It paginates (ADR-0045); COULD-4 was retired into
  iteration-5.5 task 07. *(MUST-14)*
- **`docs/ci-playbook.md` tells an agent to keep versions in the README's
  tech-stack table** (`:13-15`, `:180-182`). That is the opposite of
  ADR-0020's 2026-09-11 amendment, which made it an inventory. *(MUST-15)*
- **`backend/README.md`'s hot-reload recipe fails on a taken port.** Its bare
  `docker compose up -d` also starts the `backend` container on
  `127.0.0.1:8080`, so the `mvn spring-boot:run` that follows cannot bind.
  *(MUST-16)*
- **`docs/architecture.md` says a finished iteration is in progress.** It
  reads "Next (iteration 6.5, in progress)", lists nothing from 7 or 7.5 as
  built, and says "Last updated: 2026-09-05", against its own contract of
  describing what is built plus the current iteration. Stale iteration tags
  remain at `:129-131` and `:263`. *(SHOULD-12)*

**Claims that are wrong but mislead less:**

- The two-level bottle model is cited to ADR-0006 rather than ADR-0034
  (`docs/architecture.md:266-269`). *(SHOULD-17)*
- Both quality-backlog links in `iteration-5.5.md` (`:3`, `:11`) resolve to
  `docs/tasks/tasks/quality-backlog.md`. These are the only broken relative
  links in the doc set, and nothing checks for broken links. *(SHOULD-18)*
- A feed line's fields are listed without `beerId`, `style` and `abv`
  (`docs/architecture.md:297-302`, `docs/glossary.md:105-106`), and
  `FeedPageDto.startOver` is omitted (`glossary.md:158`). *(SHOULD-49)*
- The backend module list is restated and has drifted: `backend/README.md:3-4`
  (no `profile`, no `feed`, plus a version in prose) and `README.md:165-167`
  (future tense for iterations long done). It wants one home with pointers.
  *(SHOULD-50)*
- "JUnit 5" (`README.md:190`, `docs/architecture.md:671`), though Spring Boot
  4.1.1 manages Jupiter 6. *(SHOULD-51)*
- `ArchitectureRulesRejectViolationsTest` is said to run four rules (it runs
  eight), and the fixture is said to cover only `noClasses()` rules
  (`backend/README.md:131`, `docs/architecture.md:676`). *(SHOULD-52)*
- ADR-0053 says an event carries "ids and `occurredAt`, never a copy of
  anything that can change", but `BottleAdded` carries the editable
  `brewedDate`. ADR-0058 adopted the opposite, and ADR-0053 was never amended.
  *(SHOULD-41)*

(Quality backlog MUST-12, MUST-14, MUST-15, MUST-16, SHOULD-12, SHOULD-17,
SHOULD-18, SHOULD-41, SHOULD-49, SHOULD-50, SHOULD-51 and SHOULD-52.)

## Scope

Each claim above is corrected where it is wrong, or reduced to a pointer
where it is a copy. A relative-link check joins `make check`, so a link like
SHOULD-18's fails the build.

## Non-goals

- Why `docs/architecture.md` drifts at every iteration close. That is quality
  backlog SHOULD-59, a process finding about the iteration-close checklist.
  This task fixes the drift standing today, and SHOULD-59 is what stops it
  recurring.
- The public-route lists — [task 12](12-public-routes-one-list-pinned-by-a-test.md).
- The §2 diagram and §7's testing table — [task 14](14-boundary-guards-catch-what-the-docs-claim.md).
- Findings still tagged `[needs decision]`, such as the Radix rationale copies
  (SHOULD-20) and the `--wait` contradiction (SHOULD-54).

## Constraints

- Each fact has one home: ADRs hold *why*, `docs/architecture.md` holds
  *shape*, READMEs hold *how* ([ADR-0020](../../adr/0020-documentation-roles.md)).
  A copy becomes a one-line pointer rather than a corrected copy.
- An accepted ADR is amended, never rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)). That applies to
  ADR-0053.
- Versions live in manifests only, and the README's tech-stack table is an
  inventory (ADR-0020, amended 2026-09-11). "JUnit 6" is a name that carries a
  number because the number is the point, not a pin.
- The link checker follows the existing `scripts/check-*.mjs` pattern: it has
  no dependencies, has its own `.test.mjs`, and is run by `make check`.

**Decided at refinement, 2026-10-15** (product owner):

- **`docs/architecture.md` §3 owns the backend module list.** Its table is the
  one `ArchitectureDocumentationTest` already checks. `backend/README.md` and
  `README.md` point to it.
- **The link checker covers every tracked Markdown file**, including the
  READMEs, `CLAUDE.md` and `.claude/`. Those are the links agents actually
  follow.

## Open questions

**None.**

## Acceptance criteria

- [x] A relative Markdown link that resolves to no file, in any tracked
      Markdown file, fails `make check` — the checker's own `.test.mjs`
      self-test, plus a clean run over today's repository
- [x] `backend/README.md`'s hot-reload recipe, run as written on a stopped
      stack, starts the backend natively on `:8080` — verified by running it
- [x] No document lists brewery as a built filter or `/breweries` as
      unpaginated; `iteration-9.md` no longer schedules the pagination
- [x] `docs/ci-playbook.md` no longer tells anyone to record versions in the
      README table
- [x] `docs/architecture.md`'s status lines name the current iteration, and
      its "Built" list includes iterations 7 and 7.5
- [x] Each remaining finding above is fixed at the cited lines, or is now a
      pointer to its one home
- [x] `make verify-fast` is green; `ArchitectureDocumentationTest` still
      passes

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-12, MUST-14,
MUST-15, MUST-16, SHOULD-12, SHOULD-17, SHOULD-18, SHOULD-41, SHOULD-49,
SHOULD-50, SHOULD-51 and SHOULD-52, all confirmed 2026-10-14. Merged on the
precedent of [iteration-5.5 task 01](../iteration-5.5/01-documentation-accuracy-sweep.md):
every finding is ready as written and touches only documentation, so one
review covers them.
