# Task 07: Front page layout

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-3, DW-4, DW-5

## Why

The front page is the page that has to explain Kalia to someone who has never
heard of it, and — after [iteration 7](../iteration-7.md) — the page that shows
the product working. Those are two jobs, and nothing has ever laid them out
together.

Today it is three centred elements: a heading, a tagline, a button. Iteration 7
adds a live feed beneath them, designed as a list of sentences, and its own
task file says the page "today renders a static welcome" and that this
iteration "replaces it". What it does not decide is the relationship between
the two halves — whether a visitor arrives at a pitch with a feed under it, or
at a feed with a pitch beside it, or at something that is neither.

The feed also makes this the first page in Kalia that **changes while someone
is looking at it** ([iteration 7 task 07](../iteration-7/07-live-front-page.md)),
which is a layout problem before it is an accessibility one: content that
arrives has to arrive somewhere that does not move what the reader is looking
at.

There are two shapes nobody has drawn. A brand-new visitor sees a feed of
strangers' bottles and has no account; a signed-in user with a cellar sees the
same page and may want something else from it. Whether the front page is one
layout or two is unanswered.

## Scope

The front page's layout, prototyped and chosen: what a visitor sees first, how
the feed and the pitch relate, what a feed entry looks like, how new entries
arrive, and what the page is when the feed is empty or failing.

Both audiences — signed out and signed in — and both agreed widths. Includes
the page's loading skeleton and empty state, since
[ADR-0022](../../adr/0022-loading-error-empty-states.md)'s skeletons are
shape-matched to the layout this task changes.

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

- **Depends on [iteration 7](../iteration-7.md) having landed.** There is no
  feed to lay out before it, and prototyping against a feed that does not exist
  yet produces a layout for imagined data.
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

## Open questions

1. **Is this a landing page with a feed, or a feed with a header?** The single
   biggest question in the task, and it is a product question as much as a
   visual one — it says whether Kalia introduces itself or shows itself.
2. **Does a signed-in user get a different front page?** They have a cellar,
   they know what Kalia is, and the pitch is dead space to them.
3. **What is a feed entry, visually?** Iteration 7 designs it as a sentence.
   Whether that stays a line of text, becomes a card, or becomes something with
   the beer's visual stand-in from
   [task 04](04-imagery-iconography-and-the-mark.md) on it, is open.
4. **How does a new entry arrive?** Appearing at the top silently, appearing
   with motion, or waiting behind a "3 new" control the reader clicks. The
   third is the only one that never moves what someone is reading.
5. **How much feed is on the page?** There is no pagination in iteration 7's
   design and no infinite scroll; a front page that grows forever is a
   different page from one that shows ten.
6. **What does an empty feed look like?** On a brand-new instance with no
   bottles anywhere, this is the first thing every visitor sees, and it is
   currently nobody's page.
7. **What happens when the feed fails but the page loads?** The pitch is still
   valid and the feed is not; one `error.tsx` for the whole route
   ([ADR-0022](../../adr/0022-loading-error-empty-states.md)) may be the wrong
   granularity here.

## Acceptance criteria

- [ ] The product owner chose from built alternatives for the page's basic
      shape, looked at with real feed data rather than placeholder text
- [ ] Signed-out and signed-in front pages are both covered — either as one
      layout that demonstrably works for both, or as two
- [ ] The page's loading skeleton matches the layout that ships, and its
      colocated vitest test asserts the match rather than the old shape
- [ ] Empty feed, failing feed and loaded feed each render deliberately, each
      covered by a test
- [ ] New entries arrive without moving content the reader is already looking
      at, verified in a browser and covered by a Playwright assertion
- [ ] `prefers-reduced-motion` is honoured by anything this task animates
- [ ] The page works at both agreed widths, and the
      `@axe-core/playwright` scan passes at both
- [ ] The findings [task 02](02-design-audit-baseline.md) recorded on the front
      page are each fixed or carry a written decision not to fix them
- [ ] `make verify` is green
