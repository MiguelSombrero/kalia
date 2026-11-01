# Task 19: The documentation and comments say what is true now

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

Several statements in the docs and code comments have gone stale. None sends a
reader down a failing path the way iteration 9 task 18's MUSTs did, but each
is false, and `CLAUDE.md`'s first goal is that docs and implementation never
drift apart:

- `web/features/feed/actions.ts` still says the feed cursor key is "minted
  fresh by a backend restart"; since iteration 8.5 task 04 it is configured
  (`FEED_CURSOR_KEY`) (COULD-78).
- `docs/architecture.md` §3 says `fi.kalia.web` holds only exception advice
  and error types, but it also holds `RequestLogFilter` and
  `UnexpectedFailureDocumentation`, and `ArchitectureDocumentationTest` calls
  it a module "with no dependency edges" though most modules depend on it
  (COULD-84).
- §5 says each feature reaches only its own tag's generated operations, but
  `eslint.config.mjs` lets `features/cellar/api.ts` import the `public-cellar`
  tag; the exception is named nowhere (COULD-85).
- [ADR-0007](../../adr/0007-backend-package-structure.md)'s Decision still
  cites "payment's `PaymentProvider`, ordering's state machine", which its own
  2026-10-24 amendment says named dropped store modules (COULD-87).
- Smaller staleness (COULD-88): `docs/architecture.md`'s "Last updated" line;
  `docs/tasks/iteration-8.5.md`'s grouping paragraph omitting tasks 21–22;
  `docs/tasks/iteration-9.md` keeping a "planned task" note that only says it
  moved; `docs/tasks/backlog.md` calling catalog search "full-text" (it is
  `pg_trgm` substring, [ADR-0044](../../adr/0044-catalog-search-indexes.md)),
  saying the API binds `127.0.0.1:8080`, and listing rate limiting as open
  despite ADR-0090; `README.md` tying the npm overrides to a `next` version
  that has moved on (a re-test is due); and `README.md` saying
  `docker-compose.dev.env` holds every secret while `KALIA_WEB_CLIENT_SECRET`
  still comes from `.env`.

## Scope

Each statement above says what is true, in the one place
[ADR-0020](../../adr/0020-documentation-roles.md) gives it.

## Non-goals

- Facts kept in several places — [task 18](18-each-fact-kept-once.md).

## Constraints

- ADR-0020: one home per fact.
- An accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- [ADR-0017](../../adr/0017-code-comment-policy.md) for the code comment.
- Closed iterations' task files are frozen requests; only their index prose
  is corrected.

**Decided at refinement, 2026-11-01** (product owner):

- **`fi.kalia.web` is described as module-neutral web infrastructure** in §3,
  ADR-0014 (amended) and `ArchitectureDocumentationTest`; nothing moves.
- **ADR-0007's outdated clause is marked as superseded** by its own 2026-10-24
  amendment, not deleted ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **The npm overrides are re-tested** against today's `next` in this task: an
  override no longer needed is removed, and the README names what holds.
- The untagged items were confirmed still true at refinement on 2026-11-01.

## Open questions

**None.**

## Acceptance criteria

- [ ] Each statement listed is corrected or confirmed already fixed, and the
      PR lists which
- [ ] `ArchitectureDocumentationTest` describes `fi.kalia.web` as
      module-neutral web infrastructure, and that test still passes
- [ ] Each npm override is re-tested against today's `next`, and the PR says
      which were kept and why
- [ ] `node scripts/check-links.mjs` and `node scripts/check-adrs.mjs` pass
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-78, COULD-84
(`[needs decision]`, open question 1), COULD-85, COULD-87 (`[needs decision]`,
open question 2) and COULD-88.
