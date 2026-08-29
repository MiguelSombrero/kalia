# Task 03: Keep realm configuration from drifting once the import stops running

- **Status:** needs-refinement
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

1. **Which mechanism?** Roughly: accept the admin console as the source of
   truth and export back to the file as a reviewed step; drive the realm from
   the file on every boot with a configuration tool such as
   `keycloak-config-cli` (idempotent, and it also solves
   [task 02](02-parameterise-realm-configuration.md)'s substitution problem);
   or script `kcadm.sh` calls. The first is cheapest and relies on discipline,
   which is what this task exists to stop relying on.
2. **Is this one decision with [task 02](02-parameterise-realm-configuration.md)?**
   If a configuration tool wins here it very likely wins there too, and the two
   tasks should merge rather than pick different mechanisms a month apart.
3. **What is compared, and how strictly?** A full export diff is noisy — ids,
   timestamps and defaults churn on their own. A check that ignores too much
   passes on the change that mattered.
4. **Does the check run in CI, or only locally?** CI's `e2e` job already
   starts the full compose stack (`playwright.config.ts`), so a live realm is
   available there at no new cost — but CI always starts from an empty volume,
   so it compares the file against a realm freshly imported *from that file*
   and can never catch the drift this task is about. Catching a console-made
   change needs the check to run where the database persists, which is a
   developer's machine.
5. **What is the recovery when drift is found?** Regenerate the file from the
   realm, or reapply the file over the realm — they are opposite answers and
   one of them discards someone's work.

## Acceptance criteria

- [ ] A realm setting changed only in the admin console is detected — an
      automated check reports the drift and exits non-zero, confirmed by making
      such a change and watching it fail
- [ ] The same check passes on an untouched stack, so it is not merely always
      red
- [ ] Applying the committed configuration to an already-populated realm
      changes it, rather than being skipped the way `--import-realm` is —
      verified against a database that already holds the realm
- [ ] A fresh clone still reaches a working sign-in with the documented
      startup command and no extra manual step, verified by the Playwright
      suite from an empty volume
- [ ] The chosen mechanism and why it beat the alternatives is written down
      where [ADR-0020](../../adr/0020-documentation-roles.md) says it belongs

## Notes

Found while sketching this iteration on 2026-08-29: the drift is created by
[task 01](01-persist-keycloak-state.md) and is invisible until something
depends on a setting nobody re-applied. Whether it earns its own ADR or is
absorbed by [task 05](05-self-registration-with-email-verification.md)'s
depends on question 2.
