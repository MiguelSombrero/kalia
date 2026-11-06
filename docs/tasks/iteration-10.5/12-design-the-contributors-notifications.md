# Task 12: A contributor sees what became of their suggestion until they have read it

- **Status:** done
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** DW-3
- **Kind:** design

## Why

[Task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md) keeps a
notification for each decision until the contributor acknowledges it; nothing
in the web shows one. The product owner's brief rules out the obvious
component — a toast that vanishes on its own — because a notification has to
stay until the contributor has checked it, which makes where it lives and how
it is acknowledged the design question.

It is also the first thing Kalia says to one person rather than to everyone,
and the last step of the iteration's one journey: suggest a beer, an admin
decides, the contributor finds out.

## Scope

How a signed-in user learns they have unread notifications on any page, how
they read them, and how they acknowledge them, as
[task 03](03-decision-how-a-contributor-is-notified.md) decided — for an
approval, a rejection and an edited approval, in both locales. The interaction
is a choice the product owner makes from built alternatives, at least on:

- where the unread signal sits — a mark in the sticky bar, a line on the front
  page, a band on the cellar — and whether it shows a count;
- whether notifications open as a panel over the page or a page of their own;
- how an edited approval shows what the admin changed.

## Non-goals

- Notifications in the mobile app, push or email
  ([task 03](03-decision-how-a-contributor-is-notified.md)'s non-goals).
- The add-beer dialog's own outcome messages, which
  [iteration 10 task 16](../iteration-10/16-adding-a-beer-says-what-happens-to-it.md)
  settles.

## Constraints

- Follows [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md),
  whose API it reads, [task 07](07-an-admin-edits-a-suggestion-before-approving-it.md)
  and [task 11](11-design-the-admin-review-page.md), whose edit and approval
  the journey's admin performs on the page.
- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill: directions are built, the product owner
  chooses, an ADR records the choice, and the same task then builds it.
  [`docs/design.md`](../../design.md) and the page shell of
  [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md) bind
  every direction unless the ADR records a departure.
- **Each direction is built from the notification's real content:** an
  approval, a rejection with each of the four reasons, an approval after an
  edit, and several unread at once, in Finnish as well as English.
- The unread count is one backend call on every signed-in page render, with
  no polling (task 03), made on the server and never in a client component.
  **The signed-in beer page already makes four backend calls, which is what
  `edge/limits.json` pins as `backendCallsPerPageRender`**,
  [ADR-0090](../../adr/0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)
  states the load it computes, and `web/e2e/backend-calls-per-render.spec.ts`
  asserts the heaviest render makes exactly that many. The count is a fifth, so
  this task raises the pin to 5 and amends ADR-0090's stated load in the same
  change; `scripts/check-compose.mjs` fails until the two agree. Task 09's API
  serves the count apart from the list so that this call carries nothing else.
  A page's own render calls are pinned by its `page.backendCalls.test.tsx`
  where it has one ([ADR-0083](../../adr/0083-a-cellar-read-is-joined-with-its-beers-in-the-backend.md)'s
  Evidence).
- Reading the list and acknowledging one are Server Actions, within
  `backendCallsPerServerAction`. Acknowledging a notification already gone
  answers `404` (task 09), and the web treats that as "already gone": it
  refreshes the list rather than showing an error.
- What the notification can say of an edit is what ADR-0103 froze: the name as
  suggested and as decided, and that it was edited. An edit that left the name
  alone is shown as edited, with the link to the beer's page, which shows the
  rest.
- **The journeys' contributor is a fresh account of its own**
  (`createFreshAccount`, `web/e2e/support/keycloakAccount.ts`), so the
  notifications it holds are exactly the ones that journey caused; the worker
  `account` is shared by every spec. The admin is the worker-scoped
  `adminAccount`, and finds the suggestion in the queue by its unique name, as
  [task 11](11-design-the-admin-review-page.md) does.
- Radix is the UI dependency for dialogs and toasts; a new one is asked, not
  researched (`CLAUDE.md`).
- Tokens only, states per [ADR-0022](../../adr/0022-loading-error-empty-states.md),
  WCAG 2.2 AA — an unread mark is announced to a screen reader, not only
  coloured — and every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- How a notification is acknowledged, what it holds and links to, and that the
  unread count is read once per render are
  [task 03](03-decision-how-a-contributor-is-notified.md)'s decisions.

**Decided at refinement, 2026-11-04** (product owner):

- **Wording** of each outcome's notification is drafted in the PR, in both
  locales, for the product owner's review.
- *Derived:* **the unread signal appears on every page that renders the
  signed-in page shell,** the admin area included, wherever the chosen
  direction places it; a page without that shell shows nothing.

**Decided at refinement, 2026-11-06** (product owner; the second pass checked
this file against ADR-0103 and the event task 06 shipped):

- **The unread count is the fifth backend call of the heaviest render:** the
  pin rises to 5 and ADR-0090's stated load with it, wherever it states it (600
  to 750 backend calls a second through page renders). Folding the count into
  a call the render already makes, or keeping it off the beer page, was
  rejected.
- **An edit is told as the name pair and an `edited` mark, nothing more**
  ([task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md)'s
  decision), so how an edited approval shows what the admin changed is a choice
  among ways of showing that, not of showing more.

## Open questions

**None.** Every question was answered at refinement — task 03's in its
Constraints, this task's above.

## Acceptance criteria

- [x] The product owner chose from built alternatives, at minimum where the
      unread signal sits, how notifications open, and how an edit is shown. An
      ADR records the directions and the choice, and the product owner signed
      off the built flow in the browser pane at both agreed widths
- [x] A Playwright test covers the iteration's journey on the running stack: a
      fresh contributor account suggests a beer with a new brewery, the
      suite's `adminAccount` edits and approves it, the contributor sees one
      unread notification naming the edited beer, acknowledges it, and it is
      gone after a reload
- [x] A Playwright test covers a rejection reaching its contributor the same
      way, the reason shown in the reader's language
- [x] A component test shows the unread signal announced to assistive
      technology, and absent for a user with nothing unread
- [x] A component test shows an approval's notification linking to the beer's
      page and a rejection's linking nowhere, an edited approval showing the
      name as suggested and as decided — and as edited, with no rename, when
      the names match — and an acknowledgement answered `404` removing the
      notification from the list without an error
- [x] The heaviest signed-in render makes five backend calls with the count
      read in it: `edge/limits.json` pins 5, ADR-0090 states the load that
      computes from it, and `scripts/check-compose.mjs` and
      `web/e2e/backend-calls-per-render.spec.ts` pass
- [x] Every rendered state passes `axe` with no violations, in both locales and
      at both agreed widths
- [x] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "not 'balloon tip'
that vanishes … UI task should be Design task".
