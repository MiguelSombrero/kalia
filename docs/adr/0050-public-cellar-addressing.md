# ADR-0050: A public cellar has one locale-less URL and is indistinguishable from nothing when private

- **Status:** accepted
- **Date:** 2026-08-30

## Context

[Iteration 6](../tasks/iteration-6.md) gives Kalia its first genuinely
shareable page: a cellar its owner has marked public, reached from a link or
from a profile and from nowhere else — there is no discovery, no listing and
no search over public cellars.

Three things about that page have to be decided together, because each one
constrains what the other two can honestly be.

Every route today lives under `app/[locale]/…`
([ADR-0011](0011-i18next-localization.md)), so a shared cellar is `/en/…` or
`/fi/…`: two URLs for one page, with the sharer's locale travelling to the
recipient. That is tolerable for a page nobody links to and it is the whole
point of this one. Anything that later maps these URLs onto something else —
a search result, a share preview, an installed app claiming the domain
([backlog](../tasks/backlog.md)) — has to be told the rule, and changing the
rule afterwards means telling all of them again.

A request for a cellar that is not public also has to answer something, and
the choice is visible from outside: a 403 for private against a 404 for
unknown tells a stranger walking usernames exactly who has a cellar.
[architecture.md §4](../architecture.md) already answers 404 uniformly for
another user's entry or bottle, for the same reason.

And "public" is doing two jobs at once. Public to anyone holding a link and
public to a search engine are different promises, and the control a user
clicks can only be worded honestly once it is known which one they are
agreeing to.

## Decision

**A public cellar is addressed by the locale-less URL `/cellars/{username}`;
a cellar that is not public answers 404 exactly as an unknown one does; and
the page is served `noindex, nofollow`.**

The locale-less form is the URL the app offers for copying and the one every
external consumer is given. It needs no new mechanism: `proxy.ts` already
redirects locale-less requests by `Accept-Language`, so a recipient lands in
their own language rather than the sharer's. The locale-prefixed pages remain
reachable and carry `hreflang` alternates and a `rel="canonical"`, so anything
that de-duplicates sees one page rather than two.

404 is uniform and caller-independent. A private cellar, a cellar that never
existed and a username nobody has claimed are one response, and the owner
opening their own private URL gets it too — so the profile page offers the
public link only while the cellar is public. There is no branch anywhere that
answers differently based on who is asking, because a branch is what rots back
into an oracle.

`noindex, nofollow` makes "anyone with the link" literally true, which is what
the visibility control is allowed to say. Making public cellars discoverable
would be a separate, deliberate decision, and this record is what stops it
happening as a side effect of someone adding a sitemap.

The public response is its own DTO type rather than the owner's, carrying the
same fields it does today. Nothing in a cellar is private by nature — a beer's
price is catalog data and already public — so withholding any current field
would be arbitrary; a separate type is the seam that lets a *future* field be
owner-only without the public shape inheriting it by default.

## Alternatives considered

**403 for private, 404 for unknown.** Honest to a legitimate visitor: the link
was right, the owner changed their mind, and the page could say so. Rejected:
the pair is an enumeration oracle over every username, and it fails silently —
an implementation with this split passes every functional test while telling
strangers who has a cellar.

**404 for strangers, 403 for the owner at their own private URL.** Strangers
learn nothing and the owner is told why. Rejected: it is a caller-dependent
status on a public path, which has to be tested in both directions forever or
it decays into 403-for-everyone.

**Keep the locale prefix and pick a canonical locale.** No routing change at
all. Rejected: the sharer's locale still travels to the recipient, which is
the actual complaint, and a canonical tag does not fix what a human reads.

**A locale-less `/u/{username}` profile URL that renders the cellar.** Fewer
URLs overall. Rejected: it conflates the profile page with the public cellar
page, which iteration 6 keeps as separate tasks with different audiences.

**Make public cellars indexable.** Search is how people find things, and a
public page that no engine can see is a smaller feature. Rejected: it is not
reversible on a user's timescale — a cellar made private again persists in
caches and results — and it silently widens what the word "public" promised
when they clicked.

**One DTO shared with the owner's endpoint.** One shape, one rendering path,
nothing to keep aligned. Rejected: every field ever added for the owner would
be published to strangers by default, failing open.

## Consequences

- Good, because there is exactly one link to share, and the recipient reads it
  in their own language.
- Good, because no status code, response body or timing difference
  distinguishes a private cellar from one that does not exist, so usernames
  cannot be walked for cellars.
- Good, because the visibility control's copy — "anyone with the link" — is
  exactly true, with no asterisk about search engines.
- Bad, because a visitor whose link has gone private sees a bare not-found and
  cannot tell a typo from a mind changed. That is the cost of the property
  above and it is paid by the legitimate visitor.
- Bad, because the owner also 404s at their own private URL, so previewing a
  cellar before publishing it is impossible; the preview exists only while
  public.
- Neutral, because the locale-prefixed URLs still exist and now need
  `hreflang` and `canonical` upkeep — one page with three addresses, of which
  one is the shareable one.
- Neutral, because it is a deliberate exception to
  [ADR-0011](0011-i18next-localization.md)'s locale-prefixed rule, for
  resources whose purpose is being linked to from outside the app.
- **Revisit trigger:** Kalia wants public cellars to be discoverable — by
  search, by a browse page, or by a feed that links to strangers. Indexing and
  the 404 rule are then reconsidered together, because discoverability makes
  the enumeration argument moot rather than merely inconvenient.
