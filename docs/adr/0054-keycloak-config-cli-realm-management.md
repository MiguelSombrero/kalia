# ADR-0054: keycloak-config-cli owns realm import, not Keycloak's native placeholders

- **Status:** accepted
- **Date:** 2026-09-05
- **Amended:** 2026-09-05 — task 03's drift detection is an admin-API
  assertion (`scripts/check-keycloak-realm-config.mjs`), not the
  `--import.dry-run` mode task 03's refinement assumed keycloak-config-cli
  had; and `IMPORT_CACHE_ENABLED=false` is set so a reconcile actually
  re-applies rather than skipping on an unchanged file.

## Context

`keycloak/realm-export.json` hardcodes the `kalia-frontend` client's
`redirectUris`, `webOrigins` and `post.logout.redirect.uris` to
`http://localhost:3000`, `sslRequired` to `none`, and the client secret to
`kalia-dev-secret` in plaintext — tolerable while the realm was a disposable
fixture reimported on every start. [Task 01](../tasks/iteration-6.5/01-persist-keycloak-state.md)
made Keycloak's database durable, and `start --import-realm` only applies a
realm file the first time it sees an empty database — so from the next
persistent boot onward the committed file is applied once and never again.
This is one decision needed by two tasks: [task 02](../tasks/iteration-6.5/02-parameterise-realm-configuration.md)
needs per-environment values substituted into one committed file, and
[task 03](../tasks/iteration-6.5/03-prevent-realm-configuration-drift.md)
needs the file re-applied on every boot so the running realm cannot silently
drift from it once `--import-realm` stops re-running it.

The obvious-looking alternative is Keycloak's own `${VAR}` placeholder
resolution, gated behind `keycloak.migration.replace-placeholders`. Its own
issue tracker carries repeated reports of this failing or behaving
inconsistently across versions and import paths (keycloak/keycloak#12069,
#20199), and the current server docs describe placeholder resolution for
realm import in general but do not say whether it applies to the modern
`start --import-realm` startup path specifically — so the reliability
question needed measuring on `quay.io/keycloak/keycloak:26.7.0` (this
project's exact version) rather than assuming either the docs or the linked
issues still describe current behaviour. See Evidence.

Even had it measured as reliable, it only solves task 02's problem. Task 03
still needs something to re-apply the file after the first boot, because
`--import-realm` never runs again once the realm exists — so a second
mechanism would be needed regardless.

## Decision

**keycloak-config-cli (v6.5.1, image `quay.io/adorsys/keycloak-config-cli:6.5.1-26` —
quay.io, not Docker Hub, matching `keycloak/Dockerfile`'s own registry)
is the sole mechanism that imports and re-applies `keycloak/realm-export.json`,
replacing Keycloak's own `--import-realm` and its native `${VAR}` placeholder
substitution entirely.**

- A new `keycloak-config` service in `docker-compose.yml` runs the tool
  against the committed file on every `docker compose up`. It reconciles the
  realm to match the file whether the realm is being created for the first
  time or already exists — the property `--import-realm` doesn't have, and
  the one task 03 needs.

  > **Amended 2026-09-05 (task 03).** "Reconciles on every `docker compose
  > up`" is only true with `IMPORT_CACHE_ENABLED=false`, now set on the
  > service. Left at the tool's default, keycloak-config-cli stores a
  > checksum of the file as a realm attribute and skips the entire import
  > when the file is unchanged — so a setting changed in the admin console
  > is never reconciled back on any boot, which is the exact failure task 03
  > exists to close. With the cache off every run is a full diff/apply
  > (measured at well under a second on this realm), so re-running the
  > service — `docker compose up -d --wait keycloak-config`, or any full
  > restart — is the recovery from drift, with no separate tool to build.

- **Drift detection** (task 03) is `scripts/check-keycloak-realm-config.mjs`:
  it resolves the committed file's `$(env:...)` placeholders and asserts
  every value the file pins against what Keycloak's admin REST API reports
  for the running realm. `make keycloak-check` runs it *before*
  keycloak-config reconciles the realm, so a change made only in the admin
  console on a persistent dev stack fails the check rather than being healed
  first and never reported. It is a `make verify` gate, not a CI one: CI
  always starts from an empty volume, where the realm is imported from the
  same file the check would compare against, so it could only ever report
  zero drift.
- Per-environment values are resolved via the tool's own variable
  substitution (`IMPORT_VARSUBSTITUTION_ENABLED=true`), not Keycloak's:
  `$(env:FRONTEND_URL)`, `$(env:KEYCLOAK_SSL_REQUIRED)` and
  `$(env:KALIA_FRONTEND_CLIENT_SECRET)` in the committed file, resolved from
  environment variables the running service supplies. `undefined-is-error`
  is this tool's own default (kept explicit in `docker-compose.yml`): an
  unset variable fails the import rather than leaving a literal placeholder
  behind, for every field type — the property Keycloak's own mechanism does
  not have (see Evidence).
- The realm's client secret is supplied from an untracked root `.env`
  (`KALIA_FRONTEND_CLIENT_SECRET`), which both `keycloak-config` and the
  `frontend` service read — the same secret both sides of the OIDC client
  need, with no default in `docker-compose.yml`, so a missing `.env` refuses
  to start compose at all (`${VAR:?message}`) rather than silently booting
  with an empty or wrong secret.
- This is one decision for both task 02 and task 03: the substitution
  mechanism and the reapply-on-every-boot mechanism are the same tool
  invocation, not two.

## Alternatives considered

**Keycloak's native `${VAR}` placeholders with
`keycloak.migration.replace-placeholders=true`.** Measured directly against
`quay.io/keycloak/keycloak:26.7.0` (see Evidence): when the referenced
environment variable is set, substitution works. When it is unset, the
outcome depends entirely on whether the target field happens to be
format-validated — a redirect URI or an enum-typed field (`sslRequired`)
fails the import loudly, but a free-text field (a client `secret`) silently
imports with the literal `$(env:...)`-shaped string as the actual secret
value. That is precisely the "healthy Keycloak silently rejecting every
sign-in" failure this task exists to prevent, and it happens on exactly the
field this realm most needs to protect. Rejected on this evidence, not only
on the cited GitHub issues. It also does not address task 03 at all: a
second mechanism would still be needed to re-apply the file after the first
boot.

**Hand-scripted `kcadm.sh` reconciliation**, mirroring
`scripts/seed-keycloak-account.mjs`'s create-if-not-exists pattern but for
the whole realm. Rejected: that script's own retry and race-handling logic
exists for a single user account; a full realm (clients, protocol mappers,
attributes, and everything later tasks in this iteration add — SMTP config,
an identity provider) multiplies that surface for no benefit over a tool
that already implements idempotent diff/apply per resource kind and is
exercised by its own test suite.

> **Amended 2026-09-05 (task 03).** Task 03's refinement settled on
> keycloak-config-cli's own `--import.dry-run=true` to *report* drift
> without applying it. That mode does not exist: it is an open feature
> request ([adorsys/keycloak-config-cli#1645](https://github.com/adorsys/keycloak-config-cli/issues/1645),
> opened 2026-06-08), absent from v6.5.1's configuration-property set
> (`spring-configuration-metadata.json` in the pinned jar lists
> `import.validate`, `.parallel`, `.files.*`, `.cache.*`, `.var-substitution.*`,
> `.remote-state.*`, `.behaviors.*`, `.managed.*` — no dry-run). Three real
> alternatives were then weighed:
>
> - **Admin-API assertion — chosen.** `scripts/check-keycloak-realm-config.mjs`
>   reads the committed file and compares every value it pins against the
>   live realm via Keycloak's versioned admin REST API. Field-level, so
>   Keycloak's own defaults and generated ids never register as churn; built
>   on a stable interface; already had a home and a `make verify` wiring
>   from task 02. Its cost — it only checks what the file pins — is the
>   intended behaviour: every realm setting a later task adds to the file is
>   covered the moment it lands there, and nothing else is.
> - **Reconcile-and-report:** run keycloak-config-cli with the cache off and
>   grep its debug log for create/update/delete lines. Rejected: depends on
>   parsing log strings that are not an API and shift between versions.
> - **Export–normalize–diff** with the bundled `normalize` tool. Rejected:
>   `normalize`'s output shape is itself unstable, and the committed file's
>   `$(env:...)` placeholders would have to be pushed through the same
>   normalisation for the diff to mean anything.

## Consequences

- Good, because one committed file now describes every environment, with no
  credential in it, and the same file is what task 03's drift check
  compares the running realm against.
- Good, because the realm can no longer silently stop matching the file
  after the first boot — `keycloak-config` reconciles it every time, which
  is also what makes task 03's drift detection meaningful rather than a
  bootstrap-only check.
- Bad, because a new external dependency and container image family now
  needs tracking for its own vulnerabilities, on a release cadence
  independent of Keycloak's own — and unlike `keycloak-backend`/`keycloak-frontend`,
  `vulnerability-scan.yml` (`docs/adr/0024-dependency-vulnerability-scanning.md`)
  does not scan it: it is a pulled, not built, third-party image, and a trial
  scan of `6.5.1-26` found 34 HIGH findings in its Ubuntu base layer alone
  (none fixable by anything this repo controls — the base image itself is
  stale relative to upstream Ubuntu security updates), which would make the
  gate permanently red rather than actionable. Left unscanned until either a
  fresher upstream tag exists or this is worth its own `.trivyignore` policy
  decision.
- Neutral, because a fresh clone's `docker compose up --build` now needs a
  root `.env` with `KALIA_FRONTEND_CLIENT_SECRET` set first — a one-time step
  it did not need before, traded for no client secret existing in the
  repository.
- Neutral (task 03), because `IMPORT_CACHE_ENABLED=false` makes every
  `keycloak-config` run a full diff/apply instead of a checksum skip. On this
  realm that is sub-second; it grows with the realm, and the checksum skip is
  there to reclaim if boot time ever becomes the complaint — at the cost of
  drift no longer self-healing on restart.
- Neutral (task 03), because the drift check reads the realm through
  Keycloak's cache, which can lag a write by a few seconds: a check run in
  the moment right after a reconcile can still report the pre-reconcile
  value. It does not affect `make verify` (the check runs before the
  reconcile, or against a freshly imported realm), only a manual re-check
  immediately after manual recovery.
- **Revisit trigger:** if keycloak-config-cli's release cadence lags a
  Keycloak upgrade this project needs badly enough to block it — or if
  [#1645](https://github.com/adorsys/keycloak-config-cli/issues/1645) ships a
  dry-run/plan mode, which would let the drift check diff at the tool's own
  semantic level instead of field-by-field.

## Evidence

Measured directly against `quay.io/keycloak/keycloak:26.7.0` via
`docker run ... start-dev --import-realm`, `JAVA_OPTS_APPEND=-Dkeycloak.migration.replace-placeholders=true`,
2026-09-05:

- **Variable set, URI-shaped field (`redirectUris`).** Import succeeds; the
  admin REST API confirms the placeholder was replaced with the environment
  variable's value.
- **Variable unset, URI-shaped field (`redirectUris`).** Import fails at
  startup: `ERROR: Invalid client test-client: A redirect URI is not a valid
  URI` — the unresolved `${FRONTEND_URL}/*` fails Keycloak's own URI format
  check.
- **Variable unset, enum-typed field (realm `sslRequired`).** Import fails
  at startup: `ERROR: No enum constant
  org.keycloak.common.enums.SslRequired.${KEYCLOAK_SSL_REQUIRED}`.
- **Variable unset, free-text field (client `secret`).** Import **succeeds**:
  `KC-SERVICES0032: Import finished successfully`. The client's secret is
  now the literal string `${KALIA_SECRET}` — a healthy Keycloak with a
  broken, unreviewable credential, discovered only when someone tries to
  sign in. This is the scenario the task's own wording anticipated
  (`docs/tasks/iteration-6.5/02-parameterise-realm-configuration.md`) and
  the decisive point against this alternative: the failure mode is silent
  exactly where it matters most.

keycloak-config-cli's `IMPORT_VARSUBSTITUTION_UNDEFINEDISERROR` (default
`true`, per `README.md` in tag `v6.5.1`) fails the import for an unset
variable regardless of the target field's type, closing this gap.
