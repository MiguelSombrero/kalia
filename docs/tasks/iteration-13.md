# Iteration 13 — Social on mobile

Goal: the feed, profiles and public cellars on the phone — what makes the
cellar social.

## Done when

- **DW-1:** The feed shows what people add to public cellars, takes in new
  events while the app is open, loads older history on scroll, refreshes on a
  pull, and stops asking the server while the app is in the background.
- **DW-2:** A signed-in user can see their profile and change whether their
  cellar is public.
- **DW-3:** A public cellar can be opened in the app, from the feed and from a
  `kalia://cellars/{username}` link, signed in or out.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

- **Design: the feed and the profile on mobile.**
- **Feed** — first page, `since` polling only while in the foreground
  ([ADR-0060](../adr/0060-feed-delivery-is-polling.md)), `before` paging,
  pull to refresh.
- **Profile and cellar visibility.**
- **Public cellar view.**
- **Deep-link routing** — the custom scheme into a public cellar, including
  arriving signed out.

Universal links (an `https://` link opening the app) and sharing a link others
can open both need what this plan does not pay for — an Apple Developer
account and a reachable host — so they are parked in the
[backlog](backlog.md#mobile-client) rather than left half-built here.
