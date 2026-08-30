# ADR-0049: A `profile` module owns who a user is to other users

- **Status:** accepted
- **Date:** 2026-08-30

## Context

Kalia knows a signed-in caller only as a Keycloak `sub`
([ADR-0028](0028-resource-server-and-current-user.md)) — an opaque identifier
with nothing attached. That was enough while the only per-user data was a
cellar its owner alone could read.

[Iteration 6](../tasks/iteration-6.md) makes a cellar public, and a public
cellar has to belong to someone a stranger can name. The choice to publish it
has to be stored somewhere, too, and nothing in the app stores anything about
a user at all. Two things are therefore missing at once: a place to put
user-facing identity, and something to call a user in a URL that strangers
paste to each other.

`identity` is not obviously that place. It exists to validate bearer tokens
and resolve the current caller, and it is deliberately narrow; what a user
looks like to *other* users is a different subdomain reading on a different
side of the request.

The same question is being asked from the other side by
[iteration 6.5](../tasks/iteration-6.5.md), whose sign-up form has to decide
what it asks a new user for. Whichever iteration settles it first binds the
other, which is why it is settled here rather than twice.

## Decision

**A new `profile` Modulith module owns the user-facing identity: a profile
keyed by the Keycloak `sub`, created lazily the first time anything needs one,
carrying the token's `preferred_username` copied once and immutable in Kalia
thereafter, plus a cellar-visibility flag defaulting to private.**

That copied username is the whole of a user's public identity. It is what a
reader sees, and it is the URL segment a public cellar is addressed by
([ADR-0050](0050-public-cellar-addressing.md)). There is no separate handle
and no editable display name; Kalia has no rename path, and adding one is a
decision with its own consequences rather than a gap to be filled in passing.

A profile carries nothing else. Not a bio, not an avatar, not a joined date —
each is a column with no consumer, which is the mistake
[ADR-0032](0032-when-a-decision-earns-an-adr.md) was amended about.

Two rules follow and bind every reader:

- **A missing profile row reads as private.** Lazy creation means the row may
  legitimately not exist, and code that assumes it does fails open — the
  direction that leaks. Private survives absence.
- **`profile` is a leaf.** It depends on no other module. `cellar` reads it
  through `ProfileApi` to resolve a username to an owner id and to answer
  whether that owner's cellar is public, which is a third cross-module read
  alongside `catalog` and `identity` and follows the existing direction rather
  than inverting it.

Because `preferred_username` is the identifier, iteration 6.5's sign-up form
must collect something Keycloak will issue as one; it does not get to invent a
separate Kalia name.

## Alternatives considered

**Put the profile inside `identity`.** No new module, no new schema, and the
module that already answers "who is this caller" would answer "who is this
user" too. Rejected: `identity` is about tokens and the security filter chain
([ADR-0028](0028-resource-server-and-current-user.md)), and a profile is
public data an anonymous request reads. Merging them would put a
default-deny security module on the path of every unauthenticated public
cellar read.

**Put the visibility flag on `cellar` and skip the profile.** Visibility is a
property of a cellar, so this is the smallest possible change. Rejected: a
display name is not a cellar concept, and a public cellar still needs a
nameable owner — the module would end up holding identity anyway, under a
name that denies it.

**An immutable handle plus an editable display name.** Users present
themselves how they like, and shared links still never break. Rejected as
premature: two fields, an edit path, and a per-surface decision about which
one to show, for a product where nobody has yet asked to be called anything.

**An opaque profile UUID as the URL segment.** Unguessable, unclaimable, and
free of any rename problem. Rejected: a cellar link would tell its recipient
nothing about whose cellar it is, and the link is the entire distribution
mechanism for this feature.

**Read the Keycloak username live on every profile read.** Never stale.
Rejected: it puts a Keycloak call on every anonymous public cellar read, so a
stranger's page fails when Keycloak is down — coupling a public read path to
the identity provider it deliberately does not use.

**Create the profile eagerly at first sign-in.** A row always exists, so
readers are simpler in the common case. Rejected: it needs a hook in the auth
flow, and the missing-row path stays reachable and therefore still has to be
written and tested — so it buys a simplification it does not actually deliver.

## Consequences

- Good, because a public cellar's URL can never break: the identifier is
  immutable by construction rather than by a rule someone has to remember.
- Good, because nobody fills in a form before using the app, and no read path
  is coupled to Keycloak at request time.
- Good, because the private default survives a missing row, so the failure
  mode of lazy creation points at closed rather than open.
- Bad, because a user who renames themselves in Keycloak is stale in Kalia
  forever, and there is no rename path to fix it. The first person who cares
  is the trigger below.
- Bad, because it is one more module, one more schema, one more Flyway
  location and one more cross-module dependency for `cellar` to carry, in
  service of two columns.
- Neutral, because it settles what
  [iteration 6.5 task 05](../tasks/iteration-6.5/05-self-registration-with-email-verification.md)'s
  sign-up form asks for, before that task is refined.
- **Revisit trigger:** anyone asks to change their displayed name, or a
  username collision surfaces at sign-up. Either reopens the
  handle-plus-display-name alternative, which is additive from here — a
  display-name column alongside the immutable identifier — rather than a
  migration of the URL.
