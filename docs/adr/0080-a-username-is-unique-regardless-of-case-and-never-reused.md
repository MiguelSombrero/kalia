# ADR-0080: A reused username would hand old links to someone else, so a username is unique regardless of case and never reused

- **Status:** accepted
- **Date:** 2026-10-22

## Context

A username is Kalia's public address for a person. It is the URL of a public
cellar ([ADR-0050](0050-public-cellar-addressing.md)), the link on every feed
line that person earned, and what the public cellar page compares to decide
whether its viewer is the owner. [ADR-0049](0049-profile-module-and-public-identity.md)
promised that URL "can never break", but nothing made a username unique.
Keycloak owns the account, and registration is open
([ADR-0055](0055-self-registration-via-keycloak.md)). So when a Keycloak
account is deleted and someone else registers its username, the old owner's
links would resolve to the newcomer, and the newcomer would pass the owner
check. That is worse than a broken link.

Kalia copies the username into a `profile` row the first time it needs one
(ADR-0049). It receives no signal when a Keycloak account is deleted, so a
departed account's row looks the same as a live one. Keycloak checks
uniqueness only among the accounts it currently has, so it will accept a
name that Kalia already holds. Kalia has to answer that conflict itself.

ADR-0049's revisit trigger, "a username collision surfaces at sign-up",
names exactly this case. It points at an immutable handle plus an editable
display name.

## Decision

**A username belongs to at most one profile ever, compared regardless of
case, and a profile row is never deleted, so a departed account keeps its
username reserved permanently.** The product owner decided this on
2026-10-14 and settled its parts at refinement on 2026-10-15.

- Kalia enforces it with a unique index on `lower(username)`. Kalia does not
  rely on Keycloak lowercasing usernames. The same index serves the lookup
  by username.
- The row is the reservation. No "departed" marker is added, because nothing
  could ever set it.
- A newcomer whose Keycloak username Kalia already holds gets no profile. Kalia
  shows them a page saying the name is taken, with a way to sign out. The
  backend answers `409` on the profile routes.
- The public cellar still resolves its URL by exact spelling. The index makes
  the lookup cheap but does not widen what an address matches.

This does not reopen ADR-0049's handle-plus-display-name alternative. The
username stays the only name a person has.

## Alternatives considered

**Unique among live accounts only, with links resolved by user id.** A
username could pass to a new person, and old links would keep pointing at the
old person because they carry the id. Rejected by the product owner: the
public URL *is* the username (ADR-0050), so the address someone shared would
still lead to the new person.

**Prompt the newcomer for a different Kalia username.** This is the
handle-plus-display-name model that ADR-0049's trigger points at. Rejected:
it adds a second name and a form, and per-surface choices about which name to
show, for a case expected to be rare.

**Block the reserved name in Keycloak at registration.** The conflict would
never reach Kalia. Rejected: Keycloak would have to consult Kalia's database
on every registration, which couples registration to the backend and needs
custom Keycloak code for a rare case.

**Uniqueness exactly as spelled.** This is the simplest constraint. Rejected:
`Ada` and `ada` would be two people whose addresses differ only in case, and
whether that can happen would depend on Keycloak's normalisation, which Kalia
does not control.

## Consequences

- Good, because a feed link or a shared cellar URL can only ever lead to the
  person who earned it, and the owner check cannot be passed by a newcomer.
- Good, because the anonymous lookup by username is indexed instead of
  scanning the table.
- Bad, because a person whose Keycloak account an administrator deletes and
  recreates gets a new `sub` ([ADR-0033](0033-keycloak-account-relinking.md)).
  Kalia cannot tell them from a stranger, so they are told their own name is
  taken. Restoring them is a manual database change.
- Bad, because every username ever used is gone for good. Nobody can take
  over an abandoned name.
- Neutral, because the page appears wherever Kalia reads the newcomer's
  profile: the front page, the cellar and the profile. It does not lock the
  whole session, so the catalog still works for them. Without a profile,
  everything they do stays private (ADR-0049) and carries no link.
- **Revisit trigger:** Kalia gains its own account deletion, or a signal from
  Keycloak when an account is deleted. Either one makes a "departed" state
  possible.
