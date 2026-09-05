# Task 15: Extract a shared Keycloak admin-token/retry helper

- **Status:** needs-refinement
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

Three scripts under `scripts/` — `seed-keycloak-account.mjs`,
`check-keycloak-signin.mjs`, and `check-keycloak-realm-config.mjs` (added by
[task 02](02-parameterise-realm-configuration.md)) — each independently
implement fetching a Keycloak admin token via a password grant against
`admin-cli` in the master realm, and a retry loop riding out Keycloak's
post-healthcheck "Bootstrap in progress" transient window. The three have
already drifted: `check-keycloak-signin.mjs` throws and lets a top-level
catch call `process.exit(1)`, while the other two build their own
attempt-counter loop with slightly different structure. Found during task
02's `/code-review` (2026-09-05): a fourth copy is exactly the kind of
duplication that stops being a coincidence and starts being a pattern nobody
maintains.

## Scope

One shared, dependency-free helper that the three existing scripts import and
use instead of their own copies, with identical caller-visible behavior (same
environment variable names and defaults, same error message wording).

Also in scope: exposing that helper as a small CLI
(`node scripts/keycloak-admin.mjs <verb> …`) for the ad-hoc realm reads and
writes that verifying a realm task's acceptance criteria does by hand today —
a password-grant token piped from `curl` into `python3 -c`, rebuilt from
scratch each time ([task 03](03-prevent-realm-configuration-drift.md)'s
session did it six times). The CLI is a thin front end over the same token +
retry the three scripts share; it adds no Keycloak interaction the repo does
not already perform. Its verb set is an open question below.

## Non-goals

- Changing what any of the three scripts *check or seed*: their assertions,
  retry counts, delays and error wording stay identical before and after.
  (The CLI in scope is new surface, but only over the shared token/retry the
  scripts already contain.)
- A CLI that grows into a general `kcadm.sh` replacement — the verb set stays
  the minimum that acceptance-criteria verification for this iteration's
  realm tasks actually needs (see open question 2).
- A new npm dependency: these are one-shot Docker-job scripts that must stay
  dependency-free (no `npm install` step to run them), so the helper is a
  local file import, not a package.

## Constraints

- **None** beyond keeping each script's current behavior identical — this is
  a pure refactor, not a chance to also change retry counts, delays, or
  error wording while in the file.

## Open questions

1. **Should the three scripts' differing exhaustion behavior be unified, or
   preserved per caller?** `check-keycloak-signin.mjs` throws and its
   top-level catch calls `process.exit(1)`; `seed-keycloak-account.mjs` and
   `check-keycloak-realm-config.mjs` each print an error and call
   `process.exit(1)` directly inside the loop. A shared retry helper needs
   one shape — either it always throws (callers each wrap it once) or it
   always exits (no caller-side handling needed) — and picking one is a
   product-visible-enough decision (differs in how a failure looks in CI
   logs) to settle before writing the helper rather than while writing it.
2. **What verbs does the CLI expose?** [Task 03](03-prevent-realm-configuration-drift.md)'s
   acceptance-criteria verification needed: read a realm setting, read a
   client field, set a realm setting, add/remove a client redirect URI.
   Minimally that is `get-realm` / `get-client` / `set-realm` plus perhaps a
   generic authenticated `PUT`. The surface is a refinement call — too few
   and it is not worth having over `curl`, too many and it is the
   `kcadm.sh` re-implementation the Non-goals rule out. Whether the CLI also
   earns an acceptance criterion of its own is part of this.

## Acceptance criteria

- [ ] The three scripts import one shared admin-token/retry helper instead of
      each implementing their own — verified by `git grep` finding no
      duplicate implementation of either piece of logic
- [ ] `make keycloak-check`, the existing integration test exercising all
      three scripts together, still passes with identical observable
      behavior (same messages, same exit codes) before and after

## Notes

Spun off from [task 02](02-parameterise-realm-configuration.md)'s
`/code-review` finding on `scripts/check-keycloak-realm-config.mjs`.
