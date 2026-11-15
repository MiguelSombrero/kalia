# Task 24: The backlog and the READMEs state a decided fact once, as decided

- **Status:** refined
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The [backlog](../backlog.md)'s "Mobile client" section is where the mobile
iterations get their reasoning from. Iterations 12–14 will be refined against
it, and parts of it state decided things as if they were still open:

- **It names the old layout and calls settled questions open.** It refers to
  `frontend/app/api/` and `lib/api/generated/`, and says "npm workspaces,
  which this repo does not have" and "none is decided". It says crash
  reporting is "taken by Iteration 10", though
  [ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)
  deferred it. It cites §5 as "titled 'Frontend design'", and calls ADR-0012's
  rejection of a committed spec "worth revisiting". ADR-0092 to ADR-0098 have
  since decided all of these.
- **Keycloak's missing "Back to application" link is still assigned to
  iteration 10**, which closed without it. The backlog entry also carries a
  Keycloak version number that belongs only in `keycloak/Dockerfile`. The
  architecture's half of this finding was fixed by
  [iteration 11 task 13](../iteration-11/13-the-readme-and-architecture-describe-a-project-with-a-mobile-app.md).

Iteration 11 task 13 also fixed most of the facts restated away from their one
home, but three remain:

- `docs/ci-playbook.md`'s API-drift entry restates how to regenerate the
  client, which belongs in `packages/README.md`.
- `mobile/README.md`'s test section gives a narrower trigger for the `mobile`
  CI job than `scripts/ci-changes.mjs`, which calls itself the one place that
  policy is stated.
- `mobile/README.md`'s SDK upgrade section lists the packages that
  `.github/dependabot.yml` ignores, and the Dependabot comment points back at
  the README.

A copy kept by hand drifts silently. The first two copies of the regeneration
steps had already dropped the `make openapi-spec` step that has to come first.

## Scope

- The backlog's Mobile client analysis is marked "as written 2026-08-08",
  and its table row and "worth knowing" items point to where each question
  was decided.
- The "Back to application" link is assigned to iteration 13, and
  `iteration-13.md` names it.
- Each remaining restated fact is a one-line pointer to its home.
- A check fails when the backlog's table assigns an item to an iteration that
  is `done`, so the next closed iteration cannot leave the same stale
  assignment behind.

## Non-goals

- Rewriting the analysis's reasoning, which stays as the record of why the
  mobile iterations were planned the way they were.
- The other backlog sections.

## Constraints

- **Each documented fact has one home**
  ([ADR-0020](../../adr/0020-documentation-roles.md)). A rule whose violation
  fails silently keeps its warning inline, so a pointer must not drop such a
  warning ([CLAUDE.md](../../../CLAUDE.md)).
- **A version is recorded in its manifest and nowhere else.**
- `mobile/README.md` is at its 320-line cap. A pointer replaces the lines it
  points away from.
- **Decided at refinement (2026-11-15):**
  - **The Mobile client analysis stays (SHOULD-112)**, marked "as written
    2026-08-08", as the record of why the mobile iterations were planned as
    they were. Only its table row and its "worth knowing" items are
    corrected, to pointers at ADR-0092–0098.
  - **"Back to application" goes to [iteration 13](../iteration-13.md)
    (SHOULD-109)**, with its deep links: an Android App Link or a web bounce
    page to `kalia://auth/callback`, both free.
  - The check on the table is kept.

## Open questions

**None.**

## Acceptance criteria

- [ ] A test in `scripts/` fails when the backlog's Mobile client table
      assigns an item to an iteration whose roadmap status is done. It was
      seen to fail on today's table
- [ ] The Mobile client analysis carries its "as written 2026-08-08" mark,
      and its table row and "worth knowing" items name no path that does not
      exist and call no decided question open, verified in review against
      ADR-0092–0098
- [ ] `iteration-13.md` names the "Back to application" link
- [ ] `docs/ci-playbook.md`'s drift entry and `mobile/README.md`'s CI trigger
      and Dependabot list are one-line pointers, and `make verify-fast`'s
      link and doc-size checks pass

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-109 and SHOULD-112
(both `[needs decision]`), COULD-123 and COULD-124. The line numbers in those
findings are from before iteration 11 task 13. This task's Why describes what
is left on `dev` at `cdb22703`.
