# Task 03: Keep realm configuration from drifting once the import stops running

- **Status:** done
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** DW-2

## Why

Today `keycloak/realm-export.json` is the realm: `start-dev --import-realm`
reimports it on every start, so a change made in the admin console is erased at
the next boot and the file is unarguably the source of truth.

[Task 01](01-persist-keycloak-state.md) ends that. `--import-realm` skips a
realm that already exists, so from the first persistent boot onward the file is
applied **once** and never again. Every subsequent change — the registration
settings [task 05](05-self-registration-with-email-verification.md) turns on,
the SMTP configuration from [task 04](04-send-email-from-kalia.md), the
identity provider in [task 07](07-google-as-a-sign-up-route.md) — lands in a
database nobody reviews, while the committed file quietly stops describing
reality.

This contradicts the project's first goal directly: the docs in `docs/` are the
source of truth and code that disagrees with them is a bug in one or the other
([CLAUDE.md](../../../CLAUDE.md)). A realm file that no longer describes the
running realm is that bug, in the one component whose misconfiguration is a
security incident rather than a rendering glitch.

It is worth solving *before* the three tasks that each add realm configuration,
not after, because retrofitting means reverse-engineering a live database back
into a file.

## Scope

A way for the realm's configuration to be changed deliberately and reviewably,
such that the committed representation and the running realm cannot silently
disagree — and a check that says so if they do.

## Non-goals

- Managing Keycloak's *data* — users, sessions, credentials. Those belong in
  the database and are never committed.
- Configuring a deployed Keycloak, which does not exist.
- Building an admin UI for realm settings.

## Constraints

- Whatever is chosen has to work from an empty database *and* against a
  populated one. Bootstrap-only is exactly the failure being fixed.
- A new tool is a new dependency: list it and ask for a version rather than
  picking one ([CLAUDE.md](../../../CLAUDE.md)).
- Must not require a developer to hand-edit a database, and must not make
  `docker compose up` on a fresh clone any harder than it is now.
- The check has to fail on drift. A script that runs and exits zero because it
  found nothing to compare is the
  [frontend import-boundary fixture](../backlog.md) problem again.

## Open questions

**None.**

Resolved during refinement (2026-09-05):

1. **Which mechanism?** Decided: **keycloak-config-cli**, driving the realm
   from the committed file on every boot. Same tool and same decision as
   [task 02](02-parameterise-realm-configuration.md)'s Q1 — see question 2.
2. **Is this one decision with task 02?** Yes, confirmed — one ADR (numbered
   via `make next-adr` at implementation time) records the choice and its
   rejected alternatives once, referenced by both task files rather than
   decided twice.
3. **What is compared, and how strictly?** Decided: keycloak-config-cli's own
   `--import.dry-run=true` mode (with debug logging) reports the changes it
   *would* apply without applying them. Any reported change is drift — the
   check's exit code is non-zero whenever the dry run reports one or more
   planned changes, zero otherwise. This is diffing at the semantic level the
   tool already understands (a realm setting, a client attribute), not a raw
   JSON export diff, so it does not need a separate answer for how to ignore
   churning ids/timestamps/defaults.
4. **Does the check run in CI, or only locally?** Decided: locally only, run
   as part of `make verify` (or a pre-push hook) against a persistent
   developer stack. Confirmed by the same reasoning the question raised: CI's
   `e2e` job always starts from an empty volume, so a dry run there compares
   the file against a realm freshly imported *from that same file* — it would
   report zero drift every time regardless of whether the mechanism works,
   proving nothing about the console-made-change case this task exists for.
5. **What is the recovery when drift is found?** Decided: reapply the file
   over the realm — this is not a separate recovery step to build, since
   running keycloak-config-cli normally (without `--import.dry-run`) already
   does exactly this on every boot. "Regenerate the file from the realm"
   is not offered as a recovery path: a console-made change is treated as
   unreviewed and gets overwritten back to the committed file's state, which
   is what makes the file trustworthy as the source of truth.

> **Implementation note (2026-09-05).** Q3's `--import.dry-run=true` does not
> exist in keycloak-config-cli — it is an open feature request
> ([adorsys/keycloak-config-cli#1645](https://github.com/adorsys/keycloak-config-cli/issues/1645)).
> The drift check is instead `scripts/check-keycloak-realm-config.mjs`
> asserting every value the committed file pins against the live realm via
> the admin REST API. Q5's "reapplies on every boot" also required
> `IMPORT_CACHE_ENABLED=false`, now set. Both recorded in
> [ADR-0054](../../adr/0054-keycloak-config-cli-realm-management.md)'s
> amendments; the rest of Q3/Q5 (semantic field-level diff, no separate
> recovery tool, overwrite-not-regenerate) stands.

## Acceptance criteria

- [x] A realm setting changed only in the admin console is detected — an
      automated check reports the drift and exits non-zero, confirmed by making
      such a change and watching it fail
- [x] The same check passes on an untouched stack, so it is not merely always
      red
- [x] Applying the committed configuration to an already-populated realm
      changes it, rather than being skipped the way `--import-realm` is —
      verified against a database that already holds the realm
- [x] A fresh clone still reaches a working sign-in with the documented
      startup command and no extra manual step, verified by the Playwright
      suite from an empty volume
- [x] The chosen mechanism and why it beat the alternatives is written down
      where [ADR-0020](../../adr/0020-documentation-roles.md) says it belongs

## Notes

Found while sketching this iteration on 2026-08-29: the drift is created by
[task 01](01-persist-keycloak-state.md) and is invisible until something
depends on a setting nobody re-applied. Whether it earns its own ADR or is
absorbed by [task 05](05-self-registration-with-email-verification.md)'s
depends on question 2.
