# Task 07: Front page layout

- **Status:** done
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5
- **Kind:** design

## Why

The front page is the page that has to explain Kalia to someone who has never
heard of it, and — after [iteration 7](../iteration-7.md) — the page that shows
the product working. Those are two jobs, and nothing has ever laid them out
together.

Iteration 7 replaced the static welcome with a compact masthead — the app's
name and tagline — and the feed beneath it, a list of sentences that pages
back as the visitor scrolls. It decided what the page *does*, and said in so
many words that this iteration gives it its visual treatment
([iteration 7 task 03](../iteration-7/03-front-page-feed.md)): it was
responsible for the page being right, not for it looking finished.

The feed also makes this the first page in Kalia that **changes while someone
is looking at it** ([iteration 7 task 07](../iteration-7/07-live-front-page.md)).
New entries wait behind an "N new" control rather than moving what the reader
is looking at, and that control has never been designed either.

There are two shapes nobody has drawn. A brand-new visitor sees a feed of
strangers' bottles and has no account; a signed-in user with a cellar sees the
same page and may want something else from it. Whether the front page is one
layout or two is unanswered.

## Scope

The front page's layout, prototyped and chosen: what a visitor sees first, how
the masthead and the feed relate, what a feed entry looks like, what the
"N new" control looks like, and what the page is when the feed is empty or
failing.

Both audiences — signed out and signed in — and both agreed widths. Includes
the page's loading skeleton and empty state, since
[ADR-0022](../../adr/0022-loading-error-empty-states.md)'s skeletons are
shape-matched to the layout this task changes.

**Audit findings on this surface** ([the audit](audit.md), [DW-5](../iteration-7.5.md)): [AUD-14](audit.md), [AUD-15](audit.md), [AUD-16](audit.md), [AUD-17](audit.md), the front page's share of [AUD-06](audit.md), [AUD-07](audit.md), [AUD-09](audit.md), [AUD-47](audit.md); keep [AUD-49](audit.md). [AUD-14](audit.md) is a product finding: the task records whether it is fixed or becomes a [backlog](../backlog.md) entry.

## Non-goals

- The feed's data, delivery or privacy rules. All three belong to
  [iteration 7](../iteration-7.md) and are settled before this task starts;
  this task lays out what that iteration produces and must not quietly change
  what a feed line may say
  ([iteration 7 task 09](../iteration-7/09-feed-and-private-cellars.md)).
- Likes, comments and anything else that sends traffic back from the feed.
  [Backlog](../backlog.md).
- Rewriting the pitch. Wording is out of scope for this iteration — the
  iteration index says why — though the layout may decide a heading exists that
  did not, or that one is split in two.

## Constraints

- **Depends on [iteration 7](../iteration-7.md), which has landed.**
  Prototypes use real feed data from it, not data imagined for the layout.
- A feed line names its person by username and may link to a public cellar;
  what it may reveal is
  [iteration 7 task 09](../iteration-7/09-feed-and-private-cellars.md)'s
  decision and is not this task's to widen — including for a cellar whose
  visibility changed after the event was recorded.
- New content arriving in a live region has an announcement contract
  ([iteration 7 task 07](../iteration-7/07-live-front-page.md) owns it). A
  layout change that moves the feed out of its live region, or that makes
  arrival animate, interacts with that and with `prefers-reduced-motion`.
- The front page is the app's landing page and is currently statically
  renderable; whether it still is depends on the transport
  [iteration 7 task 05](../iteration-7/05-feed-delivery-decision.md) chose.
- The shell from [task 06](06-page-shell.md) and the identity from
  [task 03](03-visual-identity.md) are inherited, not re-decided.

- The agreed widths, reserved image shapes and the 24×24 minimum target size
  are iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **Iteration 7's front-page behaviour binds this task; it designs the
  visuals.** The feed is the page under a compact masthead, it pages back by
  infinite scroll, new entries wait behind an "N new" control, and an empty
  feed explains and invites
  ([iteration 7 task 03](../iteration-7/03-front-page-feed.md),
  [task 07](../iteration-7/07-live-front-page.md)). A direction that changes any
  of those is not one of the alternatives.
- **A signed-in variant may be prototyped.** Directions may show a signed-in
  front page that differs from the signed-out one — without the pitch, with a
  route into the visitor's own cellar. Whether one layout or two ships is the
  product owner's choice between built alternatives.
- **A feed entry may carry the image slots
  [task 04](04-imagery-iconography-and-the-mark.md) produced** — the beer's
  stand-in, the person's placeholder — or not, as prototyped.
- **A feed that fails renders its error inside the page.** The masthead
  survives, and the route-wide `error.tsx`
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)) is no longer what
  a failing first feed read shows. This is a behaviour change, so it is tested
  like one.

## Open questions

**None.**

## Acceptance criteria

- [x] The product owner chose from built alternatives for the page's basic
      shape, looked at with real feed data rather than placeholder text
- [x] Signed-out and signed-in front pages are both covered — either as one
      layout that demonstrably works for both, or as two
- [x] The page's loading skeleton matches the layout that ships, and its
      colocated vitest test asserts the match rather than the old shape
- [x] Empty feed, failing feed and loaded feed each render deliberately, each
      covered by a test — the failing one asserting that the masthead is
      still rendered and the route's `error.tsx` is not
- [x] New entries arrive without moving content the reader is already looking
      at, verified in a browser and covered by a Playwright assertion
- [x] `prefers-reduced-motion` is honoured by anything this task animates
- [x] The page works at both agreed widths, and the
      `@axe-core/playwright` scan passes at both
- [x] The findings [task 02](02-design-audit-baseline.md) recorded on the front
      page are each fixed or carry a written decision not to fix them
- [x] `make verify` is green
