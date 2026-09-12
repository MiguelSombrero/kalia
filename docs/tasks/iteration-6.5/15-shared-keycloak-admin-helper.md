# Task 15: Extract a shared Keycloak admin-token/retry helper

- **Status:** done
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

Three scripts under `scripts/` — `seed-keycloak-account.mjs`,
`check-keycloak-signin.mjs`, and `check-keycloak-realm-config.mjs` (added by
[task 02](02-parameterise-realm-configuration.md)) — each independently
implement the same password-grant-against-`admin-cli` token fetch (two of the
three, `seed-keycloak-account.mjs` and `check-keycloak-realm-config.mjs`,
apply it identically to the master realm with admin credentials;
`check-keycloak-signin.mjs` applies the identical HTTP shape to the `kalia`
realm with an arbitrary username/password), and a retry loop riding out
Keycloak's post-healthcheck "Bootstrap in progress" transient window. The
three have
already drifted: `seed-keycloak-account.mjs` relies on an uncaught throw at
exhaustion (a raw Node stack trace on stderr), while `check-keycloak-signin.mjs`
and `check-keycloak-realm-config.mjs` already catch and print a clean one-line
message before `process.exit(1)` — three retry loops, three different shapes,
not one outlier and two conformers. Found during task
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
not already perform. Its verb set is fixed by this task's Constraints below.

## Non-goals

- Changing what any of the three scripts *check or seed*: their assertions,
  retry counts, delays and error wording stay identical before and after.
  (The CLI in scope is new surface, but only over the shared token/retry the
  scripts already contain.)
- A CLI that grows into a general `kcadm.sh` replacement — the verb set stays
  exactly the four named in Constraints below, no generic `PUT` escape hatch.
- A new npm dependency: these are one-shot Docker-job scripts that must stay
  dependency-free (no `npm install` step to run them), so the helper is a
  local file import, not a package.
- A dedicated acceptance criterion proving the CLI works. It is exercised for
  real the first time a later iteration-6.5 task uses it to verify that
  task's own acceptance criteria; this task's criteria stay the two already
  covering the shared helper.

## Constraints

- Beyond the helper itself, each script's current behavior stays identical —
  this is a pure refactor, not a chance to also change retry counts, delays,
  or error message wording while in the file.
- **Exhaustion shape: the helper always throws.** Each of the three call
  sites keeps its own thin catch that reproduces its current exact
  message/exit-code behavior. This is the only shape that does not force a
  wording or output-format change on any of the three scripts — resolves the
  three-different-shapes drift described in Why without touching any script's
  observable behavior.
- **Token fetch is generalized to `{realm, username, password}`.** One
  parameterized function serves all three callers: `seed-keycloak-account.mjs`
  and `check-keycloak-realm-config.mjs` call it with the master realm and
  admin credentials, `check-keycloak-signin.mjs` calls it with the `kalia`
  realm and the arbitrary username/password it's checking. Both duplicated
  pieces of logic (token fetch and retry) end up shared by all three callers,
  not just two of them.
- **The CLI's verb set is exactly:** `get-realm [field]`, `get-client
  <clientId> [field]`, `set-realm <field> <value>`, and `redirect-uri
  add|remove <clientId> <uri>` — covering exactly what
  [task 03](03-prevent-realm-configuration-drift.md)'s manual verification
  needed (read a realm setting, read a client field, set a realm setting,
  add/remove a client redirect URI). No generic authenticated `PUT`.
- The helper lives in one file, `scripts/keycloak-admin.mjs`: it exports the
  token-fetch and retry functions for the three scripts to import, and doubles
  as the CLI entry point when invoked directly — the same
  export-and-self-invoke shape `check-keycloak-realm-config.mjs` already uses
  (`if (process.argv[1] === fileURLToPath(import.meta.url))`), rather than
  splitting a library file from a thin CLI wrapper.

## Open questions

**None.**

Resolved during refinement (2026-09-12):

1. **Should the three scripts' differing exhaustion behavior be unified, or
   preserved per caller?** Decided: the helper always throws, callers each
   wrap it once — see Constraints. This was the only option compatible with
   keeping every script's current wording and exit code unchanged, since the
   three do not share one shape today (`seed-keycloak-account.mjs` currently
   relies on an uncaught throw at exhaustion; the other two already catch and
   print a clean message first).
2. **Is the "admin token" duplicate literally admin-only, or does it
   generalize to `check-keycloak-signin.mjs`'s sign-in check too?** Decided:
   generalize to `{realm, username, password}` — see Constraints. Keeping it
   admin-only would have left `check-keycloak-signin.mjs` with its own copy of
   the token-fetch half, only partially satisfying the acceptance criterion
   that no caller keeps a duplicate of either piece of logic.
3. **What verbs does the CLI expose?** Decided: `get-realm`, `get-client`,
   `set-realm`, `redirect-uri add|remove` — see Constraints. No generic `PUT`:
   these four are exactly what task 03's verification needed, and a generic
   escape hatch is the `kcadm.sh`-replacement surface the Non-goals rule out.
4. **Does the CLI earn its own acceptance criterion?** Decided: not in this
   task — see Non-goals. It's verified in practice the first time a later
   realm task uses it for that task's own acceptance-criteria verification.

## Acceptance criteria

- [x] The three scripts import one shared admin-token/retry helper instead of
      each implementing their own — verified by `git grep` finding no
      duplicate implementation of either piece of logic
- [x] `make keycloak-check`, the existing integration test exercising all
      three scripts together, still passes with identical observable
      behavior (same messages, same exit codes) before and after

## Notes

Spun off from [task 02](02-parameterise-realm-configuration.md)'s
`/code-review` finding on `scripts/check-keycloak-realm-config.mjs`.
