# Task 01: Documentation accuracy and duplication sweep

- **Status:** refined
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

Nine quality-backlog findings, independently reconfirmed on 2026-08-23, are
all the same failure mode this project exists to guard against: a documented
fact restated in more than one place ([ADR-0020](../../adr/0020-documentation-roles.md)'s
"each fact has one home" broken), or a fact that used to be true and silently
stopped being true.

- **MUST-2** — `docs/architecture.md` §5 states `app/api/auth/[...nextauth]`
  "is the app's one route handler," but a second, intentionally
  *unauthenticated* one exists —
  `frontend/app/api/auth/backchannel-logout/route.ts`. §6 and
  `frontend/README.md` both describe it correctly; §5 contradicts them.
- **SHOULD-4** — [ADR-0013](../../adr/0013-logging-conventions.md)'s 2026-07-27
  Amended note says `backend/README.md` "keeps a summary and a link, not the
  restatement" of the logging conventions, but its `## Logging conventions`
  section still fully restates them.
- **SHOULD-5** — `docs/roadmap.md`'s "Iteration DoD gate" paragraph restates
  CLAUDE.md's own bullet of the same name near-verbatim; `docs/roadmap.md`
  isn't one of ADR-0020's sanctioned homes for a rule like this.
- **SHOULD-6** — `backend/README.md`'s bounded-parameters bullet carries
  unlinked, multi-line "why" rationale ("a bound nobody can justify gets
  changed by the next person who finds it inconvenient," the constraint-pair
  handling in `requireOrderedAbvRange`) that per ADR-0020 should have
  graduated to an ADR. (The same finding's Lombok half is already resolved —
  that bullet is now one line with no unlinked rationale.)
- **COULD-1** — `README.md`'s tech-stack table, `docs/adr/0012-orval-api-client.md`
  and `frontend/package.json` each state a different orval version (8.24,
  8.22.0, ^8.24.0). The drift this finding originally predicted has now
  recurred a second time since it was first raised.
- **COULD-2** — WCAG 2.1 AA's enforcement mechanism is described
  near-identically in `frontend/README.md`, `docs/architecture.md` §5, and
  again in its own §7 testing-strategy table.
- **COULD-3** — The DDD-lite package-structure convention is restated in full
  in `docs/adr/0007-backend-package-structure.md`, `docs/architecture.md` §3,
  and `backend/README.md`.
- **COULD-12** — `docker-compose.yml`'s comment on the backend's published
  port still reads "the API stays unauthenticated until the auth iteration."
  Iteration 4 shipped authentication; `docs/architecture.md` §6 and
  `backend/README.md` already carry the current defence-in-depth reasoning.
- **COULD-13** — `docs/tasks/backlog.md` defers a token-refresh-logging item
  because "the frontend has no logging convention at all" — untrue since
  iteration 3: `frontend/lib/logger.ts` exists and ESLint's `no-console`
  enforces it.

Left alone, each is a trap for the next person — human or agent — who trusts
the wrong copy.

## Scope

For each finding above: restore the accurate statement, and where the same
fact appears in more than one document, reduce every copy but its
ADR-0020-assigned home to a one-line pointer.

- MUST-2's canonical fact ("there are two route handlers, one of them
  deliberately unauthenticated") already exists correctly in §6 and
  `frontend/README.md`; §5 needs a correction and a pointer, not new prose.
- COULD-1's canonical version is whichever `README.md`'s tech-stack table
  states — CLAUDE.md's "New dependencies" rule already names the README as
  "the pinned reference" — so ADR-0012 is the stale copy to fix, and a new
  automated check (see Acceptance criteria) keeps it from drifting a third
  time.
- SHOULD-5's roadmap.md copy is the one to trim; CLAUDE.md's own copy is
  exempt (CLAUDE.md explicitly may restate anything universal, per its own
  "Each documented fact has one home" bullet).

## Non-goals

- Any of the other 13 quality-backlog findings lifted into this iteration —
  each is its own task, listed in [the iteration index](../iteration-5.5.md).
- Changing which route handlers, indexes, or conventions exist. This task
  only corrects what the documentation says about them.

## Constraints

- [ADR-0020](../../adr/0020-documentation-roles.md): ADRs record *why*,
  `docs/architecture.md` records *shape*, READMEs record *how*; every other
  mention is a one-line pointer with a link.
- [ADR-0026](../../adr/0026-task-file-format.md) task-file conventions
  (this file follows them).
- SHOULD-6's bounded-parameters rationale graduates into a **new ADR**
  (bounded-request-parameters convention: named constants with a why,
  cross-field checks reported through `detail`) — resolved by the product
  owner during refinement: neither [ADR-0007](../../adr/0007-backend-package-structure.md)
  (package structure) nor [ADR-0014](../../adr/0014-shared-exception-handling.md)
  (exception handling) is a close enough topical fit to fold it into.
- COULD-13's backlog entry stays deferred — resolved by the product owner
  during refinement: only its stale blocker ("the frontend has no logging
  convention at all") gets corrected; the entry keeps citing its still-valid
  reason (bundled with the broader, still-open structured-logs/metrics/
  tracing backlog item), rather than being promoted to a task now.

## Open questions

**None.**

## Acceptance criteria

- [ ] `docs/architecture.md` §5 no longer claims there is exactly one route
      handler; it names both and points to where each is documented —
      verified by rereading §5 and §6 together
- [ ] `backend/README.md`'s Logging conventions section is a summary and a
      link to ADR-0013, not a restatement
- [ ] `docs/roadmap.md`'s Iteration DoD gate paragraph is a one-line pointer
      to CLAUDE.md, not a restatement
- [ ] `backend/README.md`'s bounded-parameters bullet's multi-line rationale
      is linked to a new ADR (bounded-request-parameters convention) rather
      than stated inline
- [ ] `README.md`, `docs/adr/0012-orval-api-client.md` and
      `frontend/package.json` agree on the pinned orval version, and a new
      automated test fails if they diverge again — confirmed by temporarily
      desyncing one value locally and rerunning it
- [ ] WCAG 2.1 AA enforcement is described in exactly one place, the other
      two reduced to links
- [ ] The DDD-lite package-structure convention is described in exactly one
      place, the other two reduced to links
- [ ] `docker-compose.yml`'s backend port comment matches the current
      defence-in-depth reasoning already in `docs/architecture.md` §6
- [ ] `docs/tasks/backlog.md`'s deferred token-refresh-logging item no
      longer cites the false "no logging convention at all" blocker, and
      still states its real remaining reason (bundled with the
      structured-logs/metrics/tracing item) — it stays deferred, not
      promoted to a task
- [ ] `node scripts/check-adrs.mjs` passes

## Notes

Quality backlog: MUST-2, SHOULD-4, SHOULD-5, SHOULD-6, COULD-1, COULD-2,
COULD-3, COULD-12, COULD-13.

Two open questions resolved by the product owner during refinement
(2026-08-23): SHOULD-6's rationale graduates into a new ADR rather than
folding into ADR-0007 or ADR-0014; COULD-13's backlog entry stays deferred
with corrected reasoning rather than being promoted to a task.
