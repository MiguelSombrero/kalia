# Task 16: Structurally pin auth.ts's shared Keycloak credentials

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

[ADR-0033](../../adr/0033-keycloak-account-relinking.md)'s amended Decision
argues `allowDangerousEmailAccountLinking: true` is safe because every
provider entry in `frontend/auth.ts` authenticates against the same Keycloak
realm and client — one identity source, not one provider entry.
`frontend/lib/auth/keycloakOptions.test.ts`
([task 08](08-revisit-account-linking.md)) pins the boolean flag itself, but
nothing pins the precondition the safety argument actually rests on: that
both entries in `providers` still derive from the one shared
`keycloakOptions` object.

Today that is true only because `auth.ts` happens to write
`Keycloak(keycloakOptions)` and `...Keycloak(keycloakOptions)` by hand for
both entries. A future edit could give one entry its own inline
`issuer`/`clientId` — it would compile, pass every existing test, and
silently reopen the hijacking risk the flag's name warns about. That is the
same class of failure task 08 was created to close (a safety argument whose
precondition can drift without anything noticing), one layer down: there, an
ADR's revisit trigger lapsed without firing; here, nothing would even fire.

## Scope

Make it structurally impossible for a Keycloak provider entry in
`frontend/auth.ts` to carry credentials other than the shared ones. The raw
client id/secret/issuer values stop being importable outside
`frontend/lib/auth/keycloakOptions.ts`; the only way to get a Keycloak
provider config becomes a function whose parameters cover just the fields
that legitimately vary between the two entries (id, name, authorization URL)
and that always closes over the same shared base internally. `auth.ts`'s
`providers` array calls that function for both entries instead of each
spreading `Keycloak(keycloakOptions)` by hand.

Also in scope: a unit test that builds both provider variants and pins them
to identical `clientId`/`issuer`, confirmed to fail if a future edit
diverges them.

## Non-goals

- **No new ADR, and no further amendment to ADR-0033** (resolved during
  refinement, see below) — the reasoning for enforcing this structurally
  rather than with a runtime assertion or review alone is carried by a code
  comment pointing at ADR-0033, and by the test itself.
- **No change to what ADR-0033 decided** — `allowDangerousEmailAccountLinking`'s
  value and the identity-source argument are untouched. This task only
  changes how the precondition that argument depends on is enforced.
- **No module-load runtime assertion in `auth.ts`** — considered and set
  aside in favor of the structural helper alone; revisit only if the helper
  proves insufficient in practice.
- **No change to `keycloakOptions.test.ts`'s existing assertion** on
  `allowDangerousEmailAccountLinking` itself — this task adds a second,
  independent test rather than touching that one.
- No change to `keycloakOptions.ts`'s internal fetch/issuer wiring (the
  `customFetch`/internal-origin redirect and the "issuer must stay
  Keycloak's public `iss`" constraint) — only what the module exports
  changes.

## Constraints

- The new test must not import next-auth's core runtime, for the same
  reason `keycloakOptions.test.ts` was split out of `auth.ts` in task 08:
  `frontend/vitest.setup.ts` globally mocks `@/auth` because importing it
  loads next-auth's runtime, which fails to resolve `next/server` outside a
  Next.js build. `next-auth/providers/keycloak` (the provider submodule, not
  `next-auth` core) is a separate import and is fine to use directly in a
  test.
- `docs/architecture.md` is checked for any pointer that names
  `keycloakOptions`'s current export shape and updated if one exists (doc-sync
  gate, `CLAUDE.md`).

## Open questions

**None.**

Resolved during refinement (2026-09-11):

1. **Which hardening approach?** Decided: a structural helper — credentials
   private to `keycloakOptions.ts`, only a provider-builder function
   exported — rather than a runtime assertion in `auth.ts` or relying on
   code review alone. It is unit-testable without importing next-auth's core
   runtime, and makes the invalid state (an entry with its own credentials)
   require editing the shared module to even attempt.
2. **Does this need an ADR?** Decided: no — neither a new ADR nor a further
   ADR-0033 amendment. The alternatives given up (runtime assertion,
   review-only) are enforcement-mechanism choices, not a new design
   decision on the subject ADR-0033 already owns; the reasoning survives as
   a code comment plus the pinning test, per
   [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s threshold.

## Acceptance criteria

- [ ] `frontend/lib/auth/keycloakOptions.ts` exports a provider-builder
      function and no longer exports the raw credentials object — verified
      by `git grep` finding no other file importing a raw `keycloakOptions`
      value
- [ ] `frontend/auth.ts`'s `providers` array builds both the `keycloak` and
      `keycloak-register` entries through that function — verified by
      reading the diff and by `npm run build` succeeding
- [ ] A unit test builds both provider variants and asserts identical
      `clientId`/`issuer`, confirmed to fail when one variant is hand-edited
      to a different value
- [ ] `npm test` and `npm run lint` pass

## Notes

Spun off from a hardening brief written against
[task 08](08-revisit-account-linking.md)'s branch before it merged
(`claude/account-linking-revisit-53636c`, [PR #246](https://github.com/MiguelSombrero/kalia/pull/246)) — the gap
this task closes exists in both that branch's version of `auth.ts` and the
pre-task-08 version, unrelated to anything task 08 itself changed.
