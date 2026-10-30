# Task 18: The documentation says what iteration 8.5 built

- **Status:** done
- **Iteration:** [9](../iteration-9.md)
- **Covers:** none

## Why

The [2026-10-27 sweep](../quality-backlog.md) found the docs behind the code in
six places, two of them MUSTs. All six come from iteration 8.5's work, and
each one either sends a reader down a path that fails or states something
false:

- `docs/architecture.md` §5 and `docs/tasks/backlog.md` say the frontend has
  two route handlers and "this stays the full list". 8.5 task 16 added a third,
  `app/api/metrics/route.ts` (MUST-19).
- `frontend/README.md` says to start `backend postgres` before `npm run
  generate:api`, but the spec is read through `edge`, so following it gives
  connection refused (MUST-20).
- §9 of `architecture.md` files ADR-0087 to ADR-0090 under a different
  subject than `docs/adr/README.md` does (SHOULD-81).
- `architecture.md` and `keycloak/README.md` say `docker-compose.yml` pins two
  images it no longer pins (SHOULD-82).
- The root README's tech stack, compose line, repository layout and
  pom-overrides note omit what 8.5 added (SHOULD-83).
- ADR-0028 still states `GET /api/v1/me` as current, though 8.5 task 02
  removed it (SHOULD-86).

[Task 08](08-workspaces-refactor.md) is about to rewrite every path in these
documents. Moving them while they are wrong carries the errors into `web/`
under a fresh-looking diff.

## Scope

Each of the six says what is true, in the one place
[ADR-0020](../../adr/0020-documentation-roles.md) gives it, with every other
mention a pointer.

## Non-goals

- The root README's architecture diagram (SHOULD-84) and the feature list kept
  in four places (SHOULD-87). Each needs a decision, and they stay in the
  backlog.

## Constraints

- [ADR-0020](../../adr/0020-documentation-roles.md): one home per fact.
- An accepted ADR is amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)), so ADR-0028 gets
  an amendment line.
- Precedes [task 08](08-workspaces-refactor.md).

## Open questions

**None.** The sweep raised none, all six findings being untagged, and
refinement on 2026-10-30 confirmed each is ready as written.

## Acceptance criteria

- [x] Following `frontend/README.md`'s generate step from a stopped stack
      produces the client without a connection error, checked by running it
- [x] Each of the six locations is corrected or reduced to a pointer, and
      `node scripts/check-adrs.mjs` and the links test are green
- [x] ADR-0028 carries an amendment line for the removed endpoint
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-19, MUST-20,
SHOULD-81, SHOULD-82, SHOULD-83 and SHOULD-86.
