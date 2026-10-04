# Iteration 12 — The cellar in your pocket

Goal: the core product, built natively — a user manages their cellar on their
phone faster than on the web, and can still read it with no signal, since a
cellar is used in a cellar.

## Done when

- **DW-1:** A signed-in user can see their cellar, add bottles of a catalog
  beer, edit and remove bottles, and add a beer from inside the cellar, on both
  platforms.
- **DW-2:** The last-loaded cellar renders with the phone in airplane mode.
- **DW-3:** A write attempted while offline tells the user so rather than
  failing silently, and a write the server rejects leaves the screen as it was
  before the attempt.
- **DW-4:** How the cellar behaves offline is a recorded decision, including
  when to revisit it.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

- **Decision: offline behaviour** — a persisted read cache now, offline writes
  deferred with a revisit trigger, or offline writes with sync; the backlog's
  sixth mobile decision.
- **Design: the cellar on mobile** — the beer list, its bottles, and the add
  and edit flows.
- **Cellar list and entry detail.**
- **Add bottles of a beer** — quantity, brewed and best-before dates with the
  platform's own pickers.
- **Edit and remove a bottle** — swipe actions, and undo where the platform
  favours it over a confirmation.
- **Add a beer from inside the cellar** — a search-and-add sheet; the backlog
  item, mobile first.
- **Persisted cache and offline state.**
- **Optimistic writes with rollback.**
- **Cellar end-to-end flows** on both platforms.
