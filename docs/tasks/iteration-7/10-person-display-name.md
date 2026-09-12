# Task 10: A person's name, for a feed line to say

- **Status:** needs-refinement
- **Iteration:** [7](../iteration-7.md)
- **Covers:** DW-2

## Why

The [vision](../../../README.md)'s line is *"Miguel Sombrero added AleSmith IPA
to the cellar"* — a first name and a last name, the way a person is introduced
to strangers, not a handle. **Kalia does not have that data.**
`profile.profile` holds `id`, `username` and `cellar_public`
([architecture.md §3](../../architecture.md)); `identity` reads exactly one
claim from the access token, `preferred_username`
(`CurrentUserService`); and no first name, last name or display name appears
anywhere in either application. Every surface that names a person today —
the profile page, and `"{{username}}'s cellar"` on the public cellar page —
prints the username, because
[ADR-0049](../../adr/0049-profile-module-and-public-identity.md) says in as
many words that the username is "the profile's whole public identity".

The feed is what makes that sentence stop being true. It is also the first
surface that shows one person's name to *another* person at scale, which
changes what the name is for: a username is an address, and a name is how a
stranger recognises someone. Kalia has been able to avoid the distinction so
far because nothing showed one user to another except a cellar they were sent
a link to.

The data most likely already exists one layer up. Keycloak's registration is
enabled ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) and its
standard form collects a first and last name; `given_name` and `family_name`
are standard OIDC claims from the same default client scope that is already
delivering `preferred_username`. So this is plausibly a read Kalia is not
making rather than a field anyone has to invent — but that is a thing to
**verify against a real token, not assume**, and the answer decides whether
this task is small or whether it has to collect the name itself.

## Scope

Giving `profile` a name to publish for a person, sourced from the identity
provider, available to the reads a feed line makes, and consistent with the way
the profile and public cellar pages already name someone.

## Non-goals

- Letting a user edit their name in Kalia. Kalia is not the system of record
  for identity ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md));
  if a name is editable it is editable in Keycloak, and whether Kalia reflects
  a later change is question 3 rather than a form this task builds.
- Avatars or any image — [task 03](03-front-page-feed.md) asks that question
  separately and nothing in Kalia has images.
- Changing what a cellar is addressed by. `/cellars/{username}` stays the URL
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)); a display name is
  not unique and cannot be a URL segment.
- The feed's own reads — [task 04](04-feed-line-composition.md) consumes what
  this exposes.

## Constraints

- **`ProfileApi` is the only way another module sees this**
  ([architecture.md §3](../../architecture.md),
  [ADR-0007](../../adr/0007-backend-package-structure.md)), so whatever shape
  is chosen is the shape [task 04](04-feed-line-composition.md) reads in a
  batch, not one row at a time.
- [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) is directly
  affected and is not to be contradicted silently: it fixes that a profile is
  created lazily, that `username` is copied from the token once and **never
  written again even if a later token carries a different one**, and that the
  username is the whole public identity. A display name either follows that
  rule or the ADR is amended to say why it does not.
- **A name may be missing and that is not an error.** A profile is created the
  first time anything needs one, from whatever the token carries; a user with
  no first or last name set must still get a feed line. Whatever the fallback
  is, it applies everywhere a name is printed, not only in the feed.
- **A real name on a public page is a larger disclosure than a username**, and
  it is the kind that cannot be taken back once indexed. It lands on
  [task 09](09-feed-and-private-cellars.md)'s decision and on the GDPR item in
  the [backlog](../backlog.md) — naming both is this task's job, solving GDPR
  is not.
- Existing rows have no name. Whatever this adds is a Flyway migration over a
  table that already has data, and the migration and the backfill story are the
  same question ([backend/README.md](../../../backend/README.md) migration
  conventions).
- Any string a user sees is translated in both locales
  ([ADR-0011](../../adr/0011-i18next-localization.md)) — including whatever
  stands in for a missing name, and including the order a name is written in,
  which is not universal.

## Open questions

1. **Does the token actually carry `given_name` and `family_name`?** The first
   thing to check, against a real access token from the running stack, because
   the answer decides the size of this task: a claim Kalia is not reading, or
   data nobody is collecting. Keycloak's default registration form collects
   both and the realm pins no custom user profile, so the expected answer is
   yes — expected is not verified.
2. **Is it one field or two?** A stored `displayName`, or `firstName` and
   `lastName` kept apart. Two fields let the UI decide the order, which is not
   the same in every locale; one field is simpler and freezes the order at
   write time.
3. **Does a name update when it changes in Keycloak?**
   [ADR-0049](../../adr/0049-profile-module-and-public-identity.md)'s rule for
   the username is *copied once, never rewritten*, and that rule is much harder
   to live with for a real name: someone who fixes a typo in their surname is
   stuck with the typo on Kalia's front page forever. Same rule, or a different
   one for this field, and if different then ADR-0049 says why.
4. **What does a line say when there is no name?** The username is the obvious
   fallback — but it re-exposes the username for exactly the people who never
   filled in a name, including owners of private cellars, which
   [task 09](09-feed-and-private-cellars.md) is deciding about.
5. **Two people can share a name.** "Miguel Sombrero" is not unique and the
   username is what tells them apart. Does a feed line ever show both, and does
   a public cellar's heading change from `"{{username}}'s cellar"` to a name?
6. **Do the profile page and the public cellar page change too?** If they keep
   showing the username while the feed shows a name, Kalia calls the same
   person two different things on two pages a visitor reaches from each other.
7. **Is a real name what Kalia wants to publish at all**, or is the vision's
   "Miguel Sombrero" simply the author's own account being used as an example?
   A chosen display name — one the user sets, defaulting to the username —
   publishes less and reads the same. This is the cheapest moment to choose,
   because nothing has been published yet.

## Acceptance criteria

- [ ] A profile carries a name to publish, populated from the identity
      provider, and a profile created from a token with no name is still valid
      — integration test covering both tokens
- [ ] `ProfileApi` answers with the name for a set of user ids, in one query,
      so [task 04](04-feed-line-composition.md) needs no per-line lookup —
      integration test
- [ ] The fallback for a missing name is applied in the `profile` module rather
      than by each caller, and is proven by a test that reads back a nameless
      profile rather than by inspection
- [ ] The Flyway migration applies cleanly to a database with existing profile
      rows, and those rows are readable afterwards — verified by the
      integration suite migrating from scratch and by a test fixture that
      existed before the migration
- [ ] Whatever question 3 decides is enforced: a second sign-in with a changed
      name either updates the stored one or provably does not — integration
      test asserting the chosen direction
- [ ] [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) is
      amended where this changes it — the username is no longer the whole
      public identity — and `node scripts/check-adrs.mjs` passes
- [ ] `docs/glossary.md` carries the new `profile` domain vocabulary;
      `node scripts/check-glossary.mjs` passes
- [ ] `mvn clean verify` is green

## Notes

Raised by the product owner while scoping this iteration: in *"Miguel Sombrero
added AleSmith IPA to the cellar"*, "Miguel" is a first name and "Sombrero" a
last name, so **no username is exposed by the text of a feed line**. That
correction narrows [task 09](09-feed-and-private-cellars.md)'s concern — a
cellar that is not public reveals no username, because it carries no link —
and widens it in a different direction, since a real name published on an
indexable landing page is a larger disclosure than a handle.
