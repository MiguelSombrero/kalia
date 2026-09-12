# Task 10: A person's name, for a feed line to say

- **Status:** dropped
- **Iteration:** [7](../iteration-7.md)

## Why

Written when the [vision](../../../README.md)'s feed line — *"Miguel Sombrero
added AleSmith IPA to the cellar"* — was read as a first name and a last name,
which Kalia stores nowhere: `profile.profile` holds `id`, `username` and
`cellar_public`, and `identity` reads exactly one claim from the access token,
`preferred_username`. This task was going to source a name from the identity
provider.

**Dropped 2026-09-12 by the product owner: the feed prints the username.** The
security analysis behind that is worth keeping, because the next person to
look at a feed line will ask the same question.

- **Showing the username is not an exposure Kalia has not already made.**
  [ADR-0050](../../adr/0050-public-cellar-addressing.md) addresses a public
  cellar as `/cellars/{username}` — the URL its owner is invited to share, and
  which their own profile page offers them. A feed line naming a public
  cellar's owner beside a link to that URL reveals nothing the link does not.
- **Usernames are already enumerable.** Self-registration is on
  ([ADR-0055](../../adr/0055-self-registration-via-keycloak.md)) and usernames
  are unique, so the registration form necessarily reports a name as taken.
  Secrecy was never available.
- **A real name publishes strictly more than a handle.** A handle is
  pseudonymous and self-chosen; a legal name is personal data in a stronger
  sense, is linkable across platforms, cannot be changed by the person it
  names, and cannot be withdrawn once a search engine holds it — which is
  exactly [task 09](09-feed-and-private-cellars.md)'s concern about an
  indexable front page. The intuition that a real name is the more conservative
  choice is backwards on the privacy axis.
- **Conflating login identifier and display name is a real anti-pattern, and
  Kalia is already fully committed to it.** The username is simultaneously a
  login identifier, the cellar URL segment
  ([ADR-0050](../../adr/0050-public-cellar-addressing.md)), and "the profile's
  whole public identity"
  ([ADR-0049](../../adr/0049-profile-module-and-public-identity.md)) — and the
  realm leaves `editUsernameAllowed` unset, so it is immutable. A fourth use
  adds no coupling that is not already there.
- **The one real caveat is not about usernames.** The realm leaves
  `bruteForceProtected` unset — Keycloak's default is off — while
  `loginWithEmailAllowed` defaults on, so the username is a valid login
  identifier, and the password policy is `length(8)` with no breach check.
  Publishing usernames does not create that weakness but does lower the cost
  of exercising it. The fix is lockout, not secrecy:
  [task 11](11-keycloak-brute-force-protection.md).

## Scope

Nothing. The work that survives — `ProfileApi` answering with a username and
the current cellar visibility for a set of user ids — is
[task 04](04-feed-line-composition.md)'s, which needed the batch read either
way.

## Non-goals

**None.**

## Constraints

**None.**

## Open questions

**None.**

## Acceptance criteria

- [ ] Not applicable — dropped before any test or code was written. The
      reasoning above is the deliverable and it lives here rather than in an
      ADR, because nothing about
      [ADR-0049](../../adr/0049-profile-module-and-public-identity.md) changed:
      re-affirming a decision is not a new one
      ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).

## Notes

Kept rather than deleted so the file and its id survive
([the template](../template.md): a dropped task keeps its file and row, and ids
are never reused). [Task 09](09-feed-and-private-cellars.md) carries the
decision forward as a constraint, so its ADR records what a feed line names
without depending on this file.
