# ADR-0057: Drop the fixed Compose project name so each worktree gets its own stack

- **Status:** accepted
- **Date:** 2026-09-11

## Context

`docker-compose.yml` pinned a top-level `name: kalia`, which fixes the Docker
Compose project name regardless of which checkout runs it. `CLAUDE.md`'s
"Parallel sessions" rule gives every task its own git worktree, and every
worktree shares one object database but runs its own `docker compose`
independently. With `name: kalia` fixed, every worktree's compose invocation
resolved to the *same* project: the same containers, network, and named
Postgres volume (`kalia_postgres-data`).

CLAUDE.md's "Environment notes" already warned about the resulting **port**
collision (two worktrees can't both bind 3000/8080/5432) and suggested
running the stack in one worktree at a time. It did not cover the deeper
problem: even a worktree not actively "using" the stack still shares its
*state*. Confirmed 2026-09-11 while implementing iteration 6.5 task 09
(deterministic test accounts): another worktree's unrelated `docker compose
up` reconfigured the shared Keycloak realm mid-session (client secret
changed, `postgres` container recreated) with no local cause, and this
session's own `docker compose down -v` (run to test from an empty volume)
would equally have destroyed whatever that other worktree had running. A
stopgap of setting `COMPOSE_PROJECT_NAME` in a worktree's own gitignored
`.env` worked for that one task but fixes nothing by default — a new worktree
or session that doesn't know this convention hits the same collision.

The product owner also runs the stack directly from the main `dev` checkout
via `make up`, not only from task worktrees, so any fix has to keep that path
working unchanged.

## Decision

Remove `docker-compose.yml`'s top-level `name: kalia` entirely, so Docker
Compose falls back to its own default: the project is named after the
basename of the directory holding the compose file. Every git worktree lives
in its own uniquely named directory, so each one now gets an isolated
project — its own containers, network and named volume — with no per-worktree
configuration required. The main `dev` checkout's directory is named `kalia`,
so its project name, container names and volume (`kalia_postgres-data`) are
unchanged; `make up`/`down`/`restart` and the CI vulnerability scan (which
checks out into a directory GitHub always names after the repo, `kalia`, and
scans images `kalia-backend`/`kalia-frontend` by name) both keep working with
no changes of their own.

This does not solve host-port contention: 3000/8080/8081/5432/6379/8025 are
still fixed in `docker-compose.yml` and hardcoded as `localhost:PORT` in
several `frontend/e2e/*.spec.ts` files and `scripts/*.mjs`. Only one worktree
can still usefully run the full stack (and the e2e suite) at a time — this
decision only stops one worktree's compose commands from silently destroying
another's containers and data.

## Alternatives considered

**Document a per-worktree `COMPOSE_PROJECT_NAME` convention**, e.g. each
worktree adds it to its own gitignored `.env`. This was the stopgap actually
used during the incident. Rejected as the permanent fix: it depends on every
future worktree/session remembering to set it before the first `docker
compose up`, and the failure mode when it's forgotten is silent — it
recreates someone else's containers and volume rather than erroring.

**Keep `name: kalia` and only strengthen the "one worktree at a time"
wording.** Rejected: it doesn't change the actual failure — any `docker
compose` command from any worktree, not only one actively "using" the stack
per the doc's intent, still touches every other worktree's live containers
and volume. It also doesn't distinguish the main checkout's normal `make up`
usage from a worktree's, which the fix needed to do anyway.

## Consequences

- Good, because a worktree's `docker compose up`/`down -v`/`restart` now only
  ever affects its own containers and volume — the failure mode that caused
  the 2026-09-11 incident is closed without any per-worktree setup step.
- Good, because the main `dev` checkout and CI are unaffected: both resolve
  to the same `kalia` project name they always had, since both run out of a
  directory literally named `kalia`.
- Neutral, because host port contention (3000/8080/8081/5432/6379/8025) is
  unchanged — running the full stack or the e2e suite in two worktrees at
  once still isn't possible, matching the already-documented fallback.
- Bad, because the project name (and therefore built image names like
  `<dir>-backend`) now depends on the checkout's directory name rather than
  being fixed. A local clone into a directory not named `kalia` would build
  differently-named images than CI's hardcoded `kalia-backend`/
  `kalia-frontend` — not a new risk (nothing previously enforced the clone
  directory name either), but now slightly more visible since the project
  name moves with it.
- **Revisit trigger:** if host-port isolation is ever added (each worktree
  binding a distinct port range), this decision's project-name isolation
  becomes a prerequisite worth combining it with, not a separate concern.

## Evidence

Verified 2026-09-11 with Docker Compose v5.5.0, `docker compose config
--format json | jq .name`, without starting any containers:

- From this worktree (`.claude/worktrees/gifted-shaw-a7db96`), pre-change:
  `"kalia"`. Post-change: `"gifted-shaw-a7db96"`.
- With `--project-directory` pointed at the main checkout
  (`/Users/miika/Projects/kalia`), post-change: `"kalia"` — unchanged from
  before the edit.

No other file in the repository hardcodes a container, network, or volume
name derived from the `kalia` project (`grep -rn "kalia-backend-1\|kalia_default\|kalia_postgres-data"`
outside this ADR and `.github/workflows/vulnerability-scan.yml`'s image-ref
scan, which checks out into a directory GitHub always names after the repo).
