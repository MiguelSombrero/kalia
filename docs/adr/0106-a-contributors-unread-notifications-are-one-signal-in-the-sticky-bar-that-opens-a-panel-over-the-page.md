# ADR-0106: A contributor's unread notifications are one signal in the sticky bar that opens a panel over the page

- **Status:** accepted
- **Date:** 2026-11-06

## Context

[ADR-0103](0103-a-contributor-is-told-what-became-of-a-suggestion-by-a-notification-that-a-new-module-keeps-until-they-acknowledge-it-and-then-deletes.md)
keeps a notification for each review decision until the contributor
acknowledges it, and the API that serves them exists. Nothing in the web shows
one. The product owner's brief rules out a toast or any notice that goes away
on its own, so the design question is where a user learns there is something
unread, how they read it, and how they acknowledge it.

It is the first thing Kalia says to one person rather than to everyone, and the
last step of the iteration's journey: suggest a beer, an admin decides, the
contributor finds out. The unread count is one backend call on each signed-in
page render ([task 12](../tasks/iteration-10.5/12-design-the-contributors-notifications.md)),
so the signal has to be something every signed-in page can carry without a
route of its own to fetch it. The identity
([ADR-0064](0064-visual-identity-can-art-square.md)), the page shell
([ADR-0067](0067-page-shell-sticky-bar-and-page-component.md)) and the feedback
rules in [`docs/design.md`](../design.md) bind every direction.

This was run under the `design-task` skill
([ADR-0062](0062-a-design-task-is-a-skill-and-a-marker.md)): two rounds of
mockups at 375 and 1280, in English and Finnish, built from the notification's
real content: an approval, a rejection with each of the four reasons, an
approval after an edit that renamed the beer, one that left the name alone, and
several unread at once. The mockups were not committed.

## Decision

**The unread signal is a single control in the sticky bar on every page that
renders the signed-in shell, and it opens the notifications in a panel
anchored to the bar over the page, where each one is acknowledged on its own.**

- **Where the signal sits.** In the bar, not in a page. It carries a count, and
  it is not drawn at all when nothing is unread. On a phone, where a word would
  crowd the wordmark, it is one object holding an envelope and the count, never
  an icon with a second box beside it.
- **How notifications open.** As a panel over the page rather than a page of
  their own: the page the contributor was on stays where it is, and closing the
  panel returns to it.
- **How an edit shows.** The name as suggested and the name as decided are
  shown as a pair in the notification, with the edit marked. An edit that left
  the name alone is marked as edited and points to the beer's page, which shows
  the rest, because ADR-0103 froze nothing more than the pair.

What each state shows and what the controls do is standing intent in
[`docs/design.md`](../design.md#notifications); the wording is in the locale
files.

## Alternatives considered

**Direction B — a Notifications page of its own.** A link with the count in the
bar leading to a route that lists every decision as a ruled row with its own
acknowledge control, the edit as two labelled lines. Not chosen: it takes the
contributor away from what they were doing to read one line, and adds a route,
where a panel reaches the same notifications from every page without leaving
it.

**Direction C — a band under the bar that opens in place.** No mark in the bar;
a tinted band at the top of every page says how many are unread and previews
the latest, and opening it pushes the page down. Not chosen: it takes height
from every page until it is dealt with, and it scrolls out of sight with the
page instead of staying in the bar, so the signal is easy to miss once the
contributor has scrolled.

**A signal with no count.** A mark alone in the bar, shown against the count in
the first round. Not chosen: the product owner kept the count, and the question
that remained was how to draw it.

**The first phone signal, an envelope and a separate count box.** Not chosen:
the product owner read the two as different things, one the notifications and
the other something else, when both are one unread signal.

**Two other single-object phone signals.** The count set on the envelope's
corner, and the count written inside a larger envelope. Not chosen: the product
owner chose the one box that holds the envelope and the count together; the
corner count reads as attached to the envelope but leaves it half hidden, and
the count inside the envelope has the least room for a second digit.

## Consequences

- Good, because a contributor learns of a decision on any page, and reads and
  acknowledges it without losing their place.
- Good, because it needs no route and no new page state: the count the render
  already reads is the whole of what the bar needs.
- Bad, because the panel is modal: the page behind it cannot be used until it
  is closed.
- Bad, because a contributor with many unread works through a scrolling panel,
  and an unacknowledged notification never expires
  ([ADR-0103](0103-a-contributor-is-told-what-became-of-a-suggestion-by-a-notification-that-a-new-module-keeps-until-they-acknowledge-it-and-then-deletes.md)),
  so the panel can grow without bound.
- Bad, because the count is a fifth backend call of the heaviest signed-in
  render, which raises the pin in `edge/limits.json` and the load
  [ADR-0090](0090-an-nginx-edge-proxy-bounds-the-anonymous-edges-and-names-the-client-address-the-services-trust.md)
  computes from it.
- Neutral, because the signal differs by width: a word and a count in the bar
  on a desktop, one object with an envelope on a phone.
- **Revisit trigger:** a second kind of notification, a need to see what was
  already acknowledged, or unread notifications piling up past what a panel
  reads comfortably.

## Evidence

Chosen from built alternatives over two rounds, each shown to the product owner
as private Artifacts. Round one showed three directions: the panel, a page of
its own and a band. The product owner chose the panel and objected to its phone
signal. Round two built three single-object versions of it, and the product
owner chose the one box on 2026-11-06.

Every colour pairing the mockups used, computed from their own values, met
WCAG AA.
