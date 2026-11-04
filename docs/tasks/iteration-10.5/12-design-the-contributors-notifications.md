# Task 12: A contributor sees what became of their suggestion until they have read it

- **Status:** needs-refinement
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

- **This task cannot be refined before [task 03](03-decision-how-a-contributor-is-notified.md)
  is done**, and follows [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md).
- **This is a design task**
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)), run
  under the `design-task` skill; [`docs/design.md`](../../design.md) and the
  page shell of [ADR-0067](../../adr/0067-page-shell-sticky-bar-and-page-component.md)
  bind every direction.
- A count read on every signed-in page is a backend call on every page;
  polling follows [ADR-0060](../../adr/0060-feed-delivery-is-polling.md) if
  task 03 chose it, and a page's backend calls are pinned by its
  `backendCalls` test.
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

## Open questions

Every question was answered at refinement on 2026-11-04 — task 03's in its
Constraints, this task's above. The task moves to `refined` once task 03's ADR
is accepted and this file is checked against it.

## Acceptance criteria

- [ ] The product owner chose from built alternatives, at minimum where the
      unread signal sits, how notifications open, and how an edit is shown. An
      ADR records the directions and the choice, and the product owner signed
      off the built flow in the browser pane at both agreed widths
- [ ] A Playwright test covers the iteration's journey on the running stack: a
      user suggests a beer with a new brewery, an admin the suite provisions edits and
      approves it, the user sees one unread notification naming the edited
      beer, acknowledges it, and it is gone after a reload
- [ ] A Playwright test covers a rejection reaching its contributor the same
      way
- [ ] A component test shows the unread signal announced to assistive
      technology, and absent for a user with nothing unread
- [ ] Every rendered state passes `axe` with no violations, in both locales and
      at both agreed widths
- [ ] `npm test`, `npm run lint` and `npm run build` are green

## Notes

Provenance: the product owner's brief for iteration 10.5 — "not 'balloon tip'
that vanishes … UI task should be Design task".
