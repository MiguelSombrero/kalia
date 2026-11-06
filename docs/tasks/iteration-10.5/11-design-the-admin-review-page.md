# Task 11: An admin reviews suggestions on a page of their own

- **Status:** done
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-1, DW-2
- **Kind:** design

## Why

Tasks [05](05-an-admin-reads-the-review-queue.md)–[07](07-an-admin-edits-a-suggestion-before-approving-it.md)
give review an API, and [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
a route only an admin reaches. What the admin works in is still undecided, and
it is most of whether review gets done: a queue that takes three clicks per
suggestion, or hides the brewery that came with the beer, or makes reject as
easy to hit as approve, is a queue that grows.

The page is Kalia's first tool rather than a page for readers. The design
language of [`docs/design.md`](../../design.md) was chosen for browsing a
catalog and a cellar, and how far a working surface follows it is part of the
choice.

## Scope

The admin review page, replacing the placeholder at `/[locale]/admin`
[task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md)
left: the queue of suggestions, one suggestion with its beer and any new
brewery, its contributor's pending and rejected counts, and the three outcomes
— approve, reject with a reason from
[task 02](02-decision-what-reviewing-a-suggestion-does.md)'s list, and edit
then approve, re-pointing at an existing brewery included — with their
confirmation, loading, error, empty and conflict states, in both locales. The
states the shipped API forces on the page are part of the scope:

- a contributor with no username, which
  [task 05](05-an-admin-reads-the-review-queue.md) serves and left to this
  task to show;
- a suggestion decided meanwhile, whether the admin learns it from a `409`
  (which says how it was decided and, where a review record exists, when) or
  from a `404` on a read, since the queue and a single read answer only what
  still waits;
- a rejection whose new brewery stays `PENDING` because another suggestion
  still needs it, which the decision's response reports as the brewery's status
  ([task 06](06-an-admin-approves-or-rejects-a-suggestion.md)) and the page
  does not call "rejected".

The interaction is a choice the product owner makes from built alternatives, at
least on:

- the queue and the suggestion on one page side by side, a list opening a page
  per suggestion, or a list expanding in place;
- whether editing is a mode of the suggestion's view or a form of its own;
- how a destructive outcome is guarded — a confirmation, an undo window, or
  neither — and how an approval with a new brewery shows that both are being
  approved.

## Non-goals

- The route guard and navigation entry — [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md).
- A mobile admin surface.
- Removing an approved beer — [task 20](20-an-admin-removes-an-approved-beer-from-its-page.md).
- Admin features beyond review.

## Constraints

- Follows tasks [05](05-an-admin-reads-the-review-queue.md),
  [06](06-an-admin-approves-or-rejects-a-suggestion.md) and
  [07](07-an-admin-edits-a-suggestion-before-approving-it.md), whose admin API
  it is built on ([architecture §8](../../architecture.md) lists the shipped
  operations), and [task 10](10-the-web-keeps-everyone-but-an-admin-out-of-the-admin-area.md),
  whose guard it stands on. The edit's refusals are task 07's: `400` for a
  value the add path would refuse, `409` naming the existing beer or brewery
  of a duplicate whatever its status, `409` for a pending brewery a sibling's
  approval has since approved, `404` for a brewery to re-point at that is not
  `APPROVED`.
- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill: directions are built, the product owner
  chooses, an ADR records the choice, and the same task then builds it. The
  choices in [`docs/design.md`](../../design.md) and the page shell of
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md) bind
  every direction unless the ADR records a departure.
- The edit form is react-hook-form + Zod
  ([ADR-0010](../../adr/0010-react-hook-form-zod.md)) mirroring, not
  replacing, the backend's rules; mutations go through TanStack Query
  ([ADR-0008](../../adr/0008-tanstack-query.md)) and a feature `api.ts`, and a
  failure is a typed `ApiError`
  ([ADR-0023](../../adr/0023-typed-api-failures.md)).
- Design tokens only ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)),
  states per [ADR-0022](../../adr/0022-loading-error-empty-states.md), WCAG 2.2
  AA, every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- **Each design direction is built from the page's real states:** a queue
  that is empty, one that is longer than a page (oldest first, paginated), and
  the conflict, `404` and refusal cases above, in Finnish as well as English.
- **Task 10's guard holds for everything built here.** A page under
  `/[locale]/admin` calls `currentUserIsAdmin()` itself and answers a
  non-admin and a signed-out visitor the not-found page before rendering any
  of itself, as the placeholder does; a layout's check is not enough, since a
  layout is not re-rendered on every navigation. **The admin route has no
  `loading.tsx`**, and neither has a route beneath it, because a boundary that
  streams the shell first sends `200` ahead of the `404`
  ([web README](../../../web/README.md)); the loading state is therefore the
  page's own, below the guard. The navigation entry stays task 10's, without a
  count.
- The decisions are Server Actions over the generated client, as the add-beer
  dialog's are, and a Server Action call may make at most
  `backendCallsPerServerAction` backend calls
  ([ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)):
  one decision is one call, and a second read after it is spent against that
  budget. The page's render stays within `backendCallsPerPageRender`.
- **The queue is shared by every Playwright worker and every run, and other
  specs leave suggestions pending** (adding a beer makes one), so the specs
  find theirs by its unique name and reach it by paging or by a link, never by
  assuming it is on the first page, and contribute as an account of their own
  (`createFreshAccount`, `web/e2e/support/keycloakAccount.ts`) so the
  contributor's counts are not another spec's. The actor is the worker-scoped
  `adminAccount` task 10 built.
- A mockup is built outside the repository and never committed; a screenshot
  never leaves the scratchpad ([rule](../../../.claude/rules/no-screenshots.md)).
- What the admin sees beside a suggestion is
  [task 05](05-an-admin-reads-the-review-queue.md)'s decision; the outcomes,
  the reason list and what an edit may change are task 02's.

**Decided at refinement, 2026-11-04** (product owner):

- **The page is designed for both agreed web widths,** like every
  reader-facing page; desktop alone was rejected.
- **Wording** of the outcomes, the reasons and the confirmation is drafted in
  the PR, in both locales, for the product owner's review.

The second pass on 2026-11-06 checked this file against ADR-0101 and ADR-0102,
the admin API tasks 05 and 06 shipped and the guard and Playwright admin task 10
shipped, and changed no decision.

## Open questions

**None.** Every question was answered at refinement on 2026-11-04 — task 02's
and task 05's in their Constraints, this task's above.

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum the queue's
      layout, how editing is entered, and how a destructive outcome is
      guarded. An ADR records the directions and the choice, and the product
      owner signed off the built page in the browser pane at both agreed widths
- [x] A Playwright test signs in as the suite's `adminAccount`, approves one
      suggestion, rejects one, and edits and approves one — each made by a
      fresh contributor and found by its unique name with other suggestions
      pending — each then shown decided, against the running stack
- [x] A component test shows a suggestion with a new brewery presenting both
      as approved together, and a rejection whose brewery stays `PENDING`
      not presenting it as rejected
- [x] A component test shows a `409` from a concurrent decision saying how it
      was decided, a `404` on a suggestion decided meanwhile, and a
      server-side refusal of an edit — the `400`, the duplicate `409` and the
      stale-brewery `409` — each shown to the admin rather than swallowed
- [x] A component test shows a contributor with no username, and a queue
      longer than a page paging
- [x] Every page this task adds under `/[locale]/admin` answers a signed-out
      visitor and a non-admin the not-found page, with status `404` and none
      of its content in the response, and the placeholder's strings and
      assertions are gone — test
- [x] The admin page's render is one of the routes
      `web/e2e/backend-calls-per-render.spec.ts` measures, and makes no more
      backend calls than `edge/limits.json` pins
- [x] Every rendered state passes `axe` with no violations, in both locales and
      at both agreed widths
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "the page creation
should be Design task".
