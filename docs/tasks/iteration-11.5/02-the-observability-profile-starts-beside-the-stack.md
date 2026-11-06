# Task 02: The observability profile starts beside the stack, and the stack without it is unchanged

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** DW-1

## Why

Every later task in this iteration sends telemetry somewhere or reads it back,
and none of them can be checked until that somewhere exists. It has to exist
without costing anyone who does not want it: a stack that every worktree
starts, and that `make verify` and the end-to-end suites run against, must not
get slower or heavier because an observability store is running beside it.

## Scope

The store and viewer task 01 chose start on request beside the local stack,
with their sources configured and nothing yet sending to them. Without the
request, the stack starts exactly the containers it does today. Each worktree's
copy runs on that worktree's own ports, and what it stores survives the
container being recreated.

## Non-goals

- Anything sending telemetry (tasks 03–06).
- Dashboards beyond what the chosen viewer provisions for its own data sources.
- The deployable definition, which gains nothing.

## Constraints

- **A port is read from the environment, never hard-coded**: each new
  published port is a `PORT_DEFAULTS` entry in `scripts/stack-ports.mjs`, so
  `make stack-env` gives each worktree its own; one missed is a collision only
  a second worktree finds ([`CLAUDE.md`](../../../CLAUDE.md),
  [README](../../../README.md#run-locally)).
- Every binding is localhost-only, like the rest of the local stack.
- `docker-compose.base.yml` is the deployable definition and stays free of
  anything dev-only; `make compose-check` fails otherwise
  ([ADR-0089](../../adr/0089-a-deployment-cannot-inherit-a-dev-credential-because-the-base-compose-file-demands-every-secret.md)).
- The image is pinned the way every other Compose image is, and is scanned
  ([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)).
- The viewer's own sign-in, if it has one, is a dev-only value in
  `docker-compose.dev.env`, never a `:-` default in a Compose file.

## Open questions

- **Functional scope.** The command that starts it — a profile flag, a second
  `-f` file, or a `make` target — as task 01 decided, and whether `make help`
  lists it.
- **Edge cases.** Starting the profile against a stack that is already up, and
  stopping it without stopping the stack.
- **Non-functional.** Whether the viewer needs a sign-in at all on a
  localhost-only port, and the volume's size limit, if any.
- **Integrations.** Which image version.

## Acceptance criteria

- [ ] With the profile on, the viewer answers on its port and lists each data
      source as reachable — verified against the running stack, not a mocked
      config
- [ ] A test in `scripts/` fails if the default stack's rendered service list
      differs from today's, and if `docker-compose.base.yml` names any of the
      profile's services; it was seen to fail with the profile wired in
      unconditionally
- [ ] `scripts/stack-ports.mjs` carries each new port, and two worktrees run
      the profile at once on different ports — verified by running both
- [ ] Recreating the container keeps what it stored
- [ ] The root README says how to start, open and stop it, and `make verify-fast`
      is green

## Notes

The image task 01 names is scanned by Trivy like every other; a finding there
is fixed on this branch.
