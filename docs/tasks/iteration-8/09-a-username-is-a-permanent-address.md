# Task 09: A username belongs to one person, permanently

- **Status:** needs-refinement
- **Iteration:** [8](../iteration-8.md)

## Why

**A username is a public address, but nothing makes it unique.** It is the
public cellar's URL ([ADR-0050](../../adr/0050-public-cellar-addressing.md)),
the link on every feed line (`FeedLineRow.tsx:32`), and the owner check
(`app/[locale]/cellars/[username]/page.tsx:57` compares usernames to decide
`isOwner`). Yet `V006__profile_schema.sql` has no `UNIQUE` constraint, and
`ProfileRepository.findFirstByUsernameOrderByCreatedAtDesc` quietly picks the
newest of any duplicates. Registration is open
([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)), so when a
Keycloak account is deleted and someone else registers the same username, the
old owner's feed lines link to the new person's cellar. The newcomer also
passes the owner check on a page addressed by that name.
[ADR-0049](../../adr/0049-profile-module-and-public-identity.md):100-101 says
the URL "can never break". Today it can point somewhere else instead, which is
worse.

**Every anonymous public-cellar read is a full table scan.** That same lookup
runs on each `GET /api/v1/cellars/{username}` with no index on `username`, and
the path variable has no `@Size` (`PublicCellarController.java:49`) on a
`permitAll` route, against
[ADR-0042](../../adr/0042-bounded-request-parameters.md).

(Quality backlog SHOULD-38 and SHOULD-37.)

## Scope

At most one profile ever holds a given username, a deleted account's username
is never handed to anyone else, the lookup by username is indexed, and the
anonymous route bounds its path variable.

## Non-goals

- Account deletion as a feature. Kalia has none of its own; accounts are
  deleted in Keycloak.
- Changing a username after creation.
- Encoding of the username in the generated client's URLs — quality backlog
  COULD-28, [task 11](11-the-bff-forwards-only-what-it-checked.md).
- Where the public-cellar visibility rule lives — quality backlog SHOULD-45,
  still `[needs decision]`.

## Constraints

**Decided 2026-10-14** (product owner, when lifting from the quality backlog):
**a username is unique and never reused.** A `UNIQUE` constraint, plus a
deleted account's username stays reserved, so an old link can never land on
someone else. Uniqueness among live accounts only, with links resolved by user
id, was considered and rejected.

- Keycloak owns the username at registration
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) and Kalia
  copies it into `profile` on first use (`ProfileService.currentProfile`).
  Keycloak can therefore accept a name that Kalia has reserved, and that
  conflict has to have an answer (question 1).
- `profile` stays a leaf module
  ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md):52).
- `currentProfile` already retries on `DataIntegrityViolationException` for
  the concurrent first-sign-in race
  ([ADR-0057](../../adr/0057-retry-on-constraint-violation-for-get-or-create.md)).
  A unique violation on `username` is a different cause that must not be
  retried into an infinite or misleading success.
- A schema change is a new Flyway migration, unless
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) allows editing
  V006 at this stage.

## Open questions

1. **What does a person see when Keycloak lets them register a username Kalia
   has reserved?** They have an account and no profile. Do they get an error
   page, a prompt to pick another Kalia username, or is the name blocked in
   Keycloak at registration?
2. **How is a username reserved once its Keycloak account is gone?** Kalia
   has no deletion signal today. Is the old profile row kept forever (which
   reserves the name for free), or does something mark it as departed?
3. **Is uniqueness case-insensitive?** Keycloak lowercases usernames.
   Whether Kalia relies on that or enforces it itself changes the constraint.
4. **How are existing duplicates handled when the constraint arrives?** Dev
   data only, but the migration has to say what it does with them.

## Acceptance criteria

- [ ] A second profile with an existing username is refused by the database —
      integration test, including the concurrent case
- [ ] A username whose account no longer exists is not assigned to a new
      account; the new account gets the behaviour question 1 decides —
      integration test
- [ ] The username lookup uses an index — integration test asserting the
      query plan, or the migration's index checked by a schema test
- [ ] A username path variable longer than the bound is refused with
      `problem+json` on the anonymous route — integration test
- [ ] Feed links and the public-cellar owner check cannot resolve to a
      different person than the one who earned them — covered by the tests
      above
- [ ] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-38 and SHOULD-37,
both confirmed 2026-10-14. Merged because both are about the same lookup and
the same column, and the index and the constraint are one migration.
