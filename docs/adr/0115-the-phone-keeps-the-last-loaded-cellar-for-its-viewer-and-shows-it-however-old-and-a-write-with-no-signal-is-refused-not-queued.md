# ADR-0115: The phone keeps the last-loaded cellar for its viewer and shows it however old, and a write with no signal is refused, not queued

- **Status:** accepted
- **Date:** 2026-11-23

## Context

A cellar is used in a cellar, where there is no signal. The backlog named
offline behaviour the sixth decision a mobile client forces and parked it for
iteration 12 ([backlog](../tasks/backlog.md#decisions-to-make-when-mobile-begins)),
and [architecture.md](../architecture.md) carries `GET /api/v1/cellar` as
uncapped "for the offline cache" until it is decided.

Nothing on the phone survives a launch today. The query client lives in
memory, resets on every change of viewer, and the cellar tab with no signal is
an error. Every later task builds on one of three shapes: a persisted read
cache, a read cache with writes deferred, or offline writes that sync later.
They differ by an order of magnitude in what has to be built and in what can go
wrong, so the choice is made once.

Four things constrain it:

- The API has no idempotency key, so a write whose answer was lost may have
  been applied, and sending it again may apply it twice.
- A cache on disk outlives the viewer reset that today makes a cached
  viewer-dependent query safe. A restore before the app knows who is signed in
  is the case that fails silently.
- The API is additive-only while an app is installed
  ([ADR-0093](0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
  so a build reads a cache an older build wrote.
- Kalia adds no cost: no hosted sync service, nothing paid in the persistence.

## Decision

The phone keeps the whole cellar it last loaded, as one unencrypted record per
viewer in `AsyncStorage`, shows it however old it is with its age always
visible, and refuses a write attempted with no signal rather than queuing it;
`GET /api/v1/cellar` stays whole, bounded by a cellar's 2,000-bottle cap.

**What is kept.** The answer of `GET /api/v1/cellar` as
[ADR-0083](0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)
returns it: every entry with its bottles and its beer's facts, and the time of
the read that produced it. Nothing else: not the catalog, the feed, a beer's
page or the profile, which need the server. Never a token
([ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md)):
tokens stay in `expo-secure-store`.

**Where.** `AsyncStorage`, already a dependency, unencrypted. The phone's own
storage protection is what guards it, which is enough because the record holds
no token, belongs to one viewer and is wiped on sign-out. The persistence is
ours, over the query client's `dehydrate` and `hydrate`, not TanStack's
persister packages: those expire a cache after 24 hours by default and need a
`gcTime` of at least that, which is capped near 24 days, so "however old" is
not available from them; and they save on every change to the query cache, so
the garbage collection of an unobserved cellar would erase the copy on disk.
Ours is written only after a successful read of the cellar, restored at launch
with the time of that read, and removed only by the rules below.

**For whom.** The record carries the id of the viewer it was read for, never a
credential. It is shown only when that id is the current viewer's, and never
before the token store has answered; until then the cellar is not shown from
it. How the id is read with no network is task 14's.

**For how long.** Until a successful read replaces it. There is no expiry: a
cache of any age is shown, with its age.

**Discarded** when the user signs out (including the same person signing back
in, since the guarantee is simplest so), when the viewer changes, when the
build that reads it is not the build that wrote it, and when it cannot be read
or is not the shape expected. An unreadable cache is the empty cache and is
logged
([ADR-0098](0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md));
a cache that cannot be written leaves the app working without one, also logged.
Nothing is read partially.

**A cold start with no signal already reaches the cellar signed in.** The token
store loads the stored tokens with no network, and a refresh that fails on the
network does not sign the user out (`mobile/src/lib/auth/tokenStore.ts`), so the
failed reads fall to the cache. No change to the token store is needed; task 14
tests that it stays so.

**A cellar on the screen is never replaced by an error.** A failed refresh
leaves what is shown, and an error appears only where there is nothing to show.

**What a write does with no signal.** An add, an edit and a removal are refused
before anything is sent: the user is told nothing was saved and why, what they
typed is kept, and the screen is as it was. The controls stay enabled, since a
phone that reports a connection may still not reach the API, so the refusal
comes when one is pressed. The check is made once, in front of the mutations.
Nothing is queued.

**A write that was sent and whose answer never arrives is "not confirmed",
never "not saved".** With no idempotency key it may have been applied, so
nothing is retried; the cellar is read again as soon as a read can succeed, and
its answer replaces what the screen shows. An edit and a removal that the
server rejects are put back with the reason, and a write not yet answered keeps
its optimistic value, marked not confirmed.

**Why the read stays whole.** An offline copy is useful only if it is the
cellar: a page of it would show a cellar that silently lacks bottles, and
sorting is the client's
([ADR-0070](0070-cellar-sortable-beers-beside-their-band-with-bottle-tiles-headed-by-vintage.md)).
Paging would move the cost into the client, as a cursor to persist, pages to
merge and a cache that is complete only some of the time. The cost is bounded
instead, by a cap on writes of 2,000 bottles in a cellar, which task 19 adds.
An entry is never empty, so no cellar holds more than 2,000 entries either.
The Evidence measures the body at the cap.

**The signal that reopens it:** a user reports a write they could not make
offline and then lost or forgot, or the product owner asks. Kalia has one user,
so a number would be invented.

**The tests it implies**, each carried by the task named:

| The test | Where |
|---|---|
| A cellar restored from the cache renders with every request failing, an error only where there is no cache | [task 14](../tasks/iteration-12/14-the-last-loaded-cellar-is-kept-on-the-phone.md) |
| The cache discarded on sign-out and on a change of viewer, never rendered for another viewer, including when restored before the token store has answered | task 14 |
| A cache from another build abandoned; an unreadable one leaves the cellar empty and logged | task 14 |
| A cache that cannot be written leaves the app working and logged | task 14 |
| A cache of any age rendered, whatever the age, and never dropped for it | task 14 |
| No token or credential in what is written | task 14 |
| A cold start with stored tokens and every request failing reaches the cellar signed in | task 14 |
| A cellar at the cap, with the longest names, serialises inside the Android per-entry limit with room to spare | task 14 |
| The time to write and restore a cellar at the cap, and the cellar rendering in airplane mode after a cold start on Android, failing with the cache off | task 14 |
| Reads paused with no connection and resumed with it, the cellar read again at once | [task 15](../tasks/iteration-12/15-the-app-knows-when-it-is-offline.md) |
| The offline notice with its age shown offline and not online, shown when the device reports a connection and the read fails | task 15 |
| An add, an edit and a removal each refused with no request sent, the form keeping what was typed, and a fourth write with no check of its own refused too | [task 16](../tasks/iteration-12/16-a-write-attempted-offline-says-so.md) |
| A write failing in flight reported as not confirmed, nothing retried, the cellar read again | task 16 |
| An edit and a removal shown at once and put back on rejection, an add not shown early, a read in flight not overwriting either | [task 17](../tasks/iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md) |
| A write not confirmed keeping its optimistic value and not rolled back at a deadline | task 17 |

**Dependencies it implies,** each asked about with its version when its task
begins, never researched here: a connectivity package, in
[task 15](../tasks/iteration-12/15-the-app-knows-when-it-is-offline.md).
Persistence needs none, since `AsyncStorage` and the query client are pinned.

## Alternatives considered

**Keep the cache in memory only (today).** The cellar tab with no signal is an
error, which is the case the phone exists for. Rejected.

**A read cache now, writes queued and synced later.** What it would add is a
queue that has to deliver each write once. The API has no idempotency key, so
a replay after a lost answer adds a second set of bottles. A queued write also
meets a cellar that has moved: the 2,000-bottle refusal, a bottle already
removed on the web (`404`), a `409`. The refusal then arrives when the user is
not there to read it, and meanwhile the screen shows a save that has not
happened. A phone with one user, and DW-3's "tells the user rather than failing
silently", do not pay for that. Rejected, with the trigger above to reopen it.

**Offline writes against a local copy with a sync.** All of the above, plus a
local store with a schema, ids made on the phone, and conflict resolution with
the web client that edits the same cellar. The largest of the three by an order
of magnitude, for a demand nobody has voiced. Rejected.

**Page the cellar read.** Paging does not remove the whole cellar from the
phone; it hands the cost to the client, which must persist the cursor, merge
pages and tolerate a cache that is only partly there, and it makes a bottle
count or a sort wrong until the last page lands. Rejected for the cap.

**Persist the whole query client with TanStack's persister.** It would keep the
catalog and the feed, which need the server and are not kept; it expires at 24
hours unless its defaults are raised past what `gcTime` allows; and it saves
what the query cache drops. Rejected for the persister of our own above.

**Keep the cache in `expo-secure-store`, or encrypt it.** Expo's documentation
says large payloads can be rejected by the platform and sets no limit, which a
cellar of a megabyte meets; encrypting in `AsyncStorage` or taking a native
encrypted database adds a dependency and a key to keep, to protect a list that
holds no secret and is wiped at sign-out. Rejected.

**Expire the cache after a day or a week.** An expired cellar is no cellar, the
worst outcome in a place with no signal, and a stale one with its age shown
lets the user judge it. Rejected.

**Keep the cache across a sign-out of the same person.** It saves one read and
makes the guarantee that one viewer's cellar never shows for another depend on
comparing who signed in. Wiping always is simpler to hold and to test.
Rejected.

## Consequences

- Good, because the cellar opens in a cellar, with its age on it, and the
  rule that stops one viewer seeing another's cellar is stated once and
  tested for the disk as the viewer reset did for memory.
- Good, because a write the user believes made is never silently lost: it is
  refused, put back, or marked not confirmed.
- Bad, because a cellar read offline may be very old, and the user may act on
  it. The age on screen is the only mitigation, and nothing nudges a reread
  except the connection returning.
- Bad, because a user offline cannot add, edit or remove, and has to remember to
  do it later. This is the cost that the revisit trigger watches.
- Bad, because the record is unencrypted on the phone and readable by whatever
  can read the app's storage.
- Bad, because the record grows with the cellar and with every field the API
  adds, and at the cap, with the longest names, it is within a factor of two of
  Android's documented per-entry limit (Evidence). The test of that size is what
  keeps a new field from crossing it silently.
- Neutral, because every build starts with no cache: a user who updates the app
  and opens it with no signal sees an empty cellar until the first read.
- Neutral, because a full read at the cap is about a megabyte and is repeated
  at each refetch; neither the backend nor the edge compresses responses today.
- Neutral, because the cap's numbers cite task 19, which merges separately and
  was decided at the same refinement; this ADR does not wait for it.
- Neutral, because the web is unchanged: its cellar is read through its own
  server and has no offline state.
- **Revisit trigger:** a user reports a write they could not make offline and
  then lost or forgot, or the product owner asks.

## Evidence

The size of `GET /api/v1/cellar` was measured with a throwaway script, not
committed, on 2026-11-23 against `dev` at `4ac21f92`, on Node 26. It builds the
response a cellar would make in the shape of the committed `backend/openapi.json`
(`EntryDto` with its `BottleDto` list and `CellarBeerDto`), with beers drawn at
random from the seeded catalog, so names, breweries, styles and strengths are
real. It serialises as minified UTF-8 JSON, which is what Jackson answers by
default, and gzips the same bytes for comparison. It was not run against a
backend; the ceiling is built from the spec.

| Entries (beers) | Bottles | Dates on each bottle | Body | gzip |
|---|---|---|---|---|
| 100 | 1,000 | none | 228 KiB | 33 KiB |
| 100 | 1,000 | brewed and best-before | 283 KiB | 34 KiB |
| 200 | 2,000 | none | 456 KiB | 66 KiB |
| 200 | 2,000 | brewed and best-before | 566 KiB | 67 KiB |
| 2,000 | 2,000 | none | 1,014 KiB | 204 KiB |
| 2,000 | 2,000 | brewed and best-before | 1,123 KiB | 206 KiB |

A cellar of 2,000 bottles is largest when each is its own entry, since an entry
repeats its beer: 2,000 entries is the most one can hold. Giving every one of
them the longest seeded beer name (117 characters) and brewery name (174), and
dates, makes 1,630 KiB: the ceiling. One entry with one dated bottle is 556
bytes.

The record adds a viewer id, a build and a time, a few hundred bytes. Android's
`AsyncStorage` is documented, for its 2.x line, to read no single entry larger
than about 2 MB and to hold 6 MB in all by default
([Known limits](https://react-native-async-storage.github.io/2.0/advanced/Limits/));
the pin is 2.2.0. A cellar at the cap fits in one record, and the ceiling is
about 80% of 2 MiB. The script drew from the 13,272 seeded beers whose brewery it could
resolve (of 4,894 breweries); the rows serve only for realistic lengths.

TanStack's persistence behaviour (24-hour default `maxAge`, `gcTime` to be at
least `maxAge`, about 24 days at most, saving on every change of the cache) is
as its
[`persistQueryClient` documentation](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
reads on 2026-11-23, and is not exercised by anything in this repository.

The time to write and restore the record on a device is task 14's measurement,
on the Android emulator.
