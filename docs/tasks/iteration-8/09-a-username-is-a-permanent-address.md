# Task 09: A username belongs to one person, permanently

- **Status:** done
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
  conflict has to have an answer, decided below.
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

**Decided at refinement, 2026-10-15** (product owner):

- **A newcomer whose Keycloak username Kalia has reserved sees a page saying
  the name is taken**, with a way to sign out. The case is rare, and this is
  the honest answer. Prompting for a different Kalia username, and blocking
  the name in Keycloak at registration, were rejected.
- **The profile row is kept forever, and that is the reservation.** Kalia
  gets no signal when an account is deleted, so no "departed" marker is
  added. [Task 02](02-add-beer-api.md)'s contributor link relies on the same
  fact.
- **Uniqueness is case-insensitive and enforced by Kalia itself**, with a
  unique index on `lower(username)`. It does not rely on Keycloak lowercasing
  usernames.
- **The constraint and the index go into `V006__profile_schema.sql`**, as
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) as amended
  on 2026-08-29 allows while nothing is deployed. No migration handles
  existing duplicates: a developer's database is recreated instead.

## Open questions

**None.**

## Acceptance criteria

- [x] A second profile with an existing username is refused by the database —
      integration test, including the concurrent case
- [x] A username whose account no longer exists is not assigned to a new
      account, and the new account is shown the page saying the name is taken
      — integration test, plus a component test of the page in both locales
- [x] A username differing from an existing one only in case is refused —
      integration test
- [x] The username lookup uses an index — integration test asserting the
      query plan, or the migration's index checked by a schema test
- [x] A username path variable longer than the bound is refused with
      `problem+json` on the anonymous route — integration test
- [x] Feed links and the public-cellar owner check cannot resolve to a
      different person than the one who earned them — covered by the tests
      above
- [x] `mvn clean verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-38 and SHOULD-37,
both confirmed 2026-10-14. Merged because both are about the same lookup and
the same column, and the index and the constraint are one migration.
