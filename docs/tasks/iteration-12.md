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

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-12/01-decision-how-the-cellar-behaves-offline.md) | Decide how the cellar behaves offline | needs-refinement |
| [02](iteration-12/02-design-the-cellar-list.md) | Design the cellar list | needs-refinement |
| [03](iteration-12/03-design-a-cellar-entry-and-its-bottles.md) | Design a cellar entry and its bottles | needs-refinement |
| [04](iteration-12/04-a-user-sees-their-cellar-on-their-phone.md) | A user sees their cellar on their phone | needs-refinement |
| [05](iteration-12/05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md) | A user opens a beer in their cellar and sees its bottles | needs-refinement |
| [06](iteration-12/06-design-the-bottle-form.md) | Design the bottle form | needs-refinement |
| [07](iteration-12/07-design-the-add-action-and-finding-the-beer-to-add.md) | Design the Add action and finding the beer to add | needs-refinement |
| [08](iteration-12/08-a-user-adds-bottles-of-a-beer-from-its-page.md) | A user adds bottles of a beer from its page | needs-refinement |
| [09](iteration-12/09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md) | A user finds a beer to add from the Add action or from the cellar | needs-refinement |
| [10](iteration-12/10-design-acting-on-a-bottle-edit-and-remove.md) | Design acting on a bottle — edit and remove | needs-refinement |
| [11](iteration-12/11-a-user-edits-a-bottle.md) | A user edits a bottle | needs-refinement |
| [12](iteration-12/12-a-user-removes-a-bottle.md) | A user removes a bottle | needs-refinement |
| [13](iteration-12/13-design-the-cellar-offline-and-a-write-that-fails.md) | Design the cellar offline and a write that fails | needs-refinement |
| [14](iteration-12/14-the-last-loaded-cellar-is-kept-on-the-phone.md) | The last-loaded cellar is kept on the phone | needs-refinement |
| [15](iteration-12/15-the-app-knows-when-it-is-offline.md) | The app knows when it is offline | needs-refinement |
| [16](iteration-12/16-a-write-attempted-offline-says-so.md) | A write attempted offline says so | needs-refinement |
| [17](iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md) | A write the server rejects leaves the screen as it was | needs-refinement |
| [18](iteration-12/18-the-cellars-flows-run-end-to-end-on-both-platforms.md) | The cellar's flows run end to end on both platforms | needs-refinement |

The table's order is the order of work, and every task was seeded at
`needs-refinement`, to be refined together in one conversation
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)). Tasks marked
as design run under the `design-task` skill
([ADR-0062](../adr/0062-a-design-task-is-a-skill-and-a-marker.md)): each
surface the cellar adds is a visual choice the product owner makes from built
alternatives, and the same task builds what was chosen over local data, so the
build tasks after it only wire it to the API.

- **First, the decision,** [01](iteration-12/01-decision-how-the-cellar-behaves-offline.md),
  because the offline tasks, 14–17, each build on its answer, and the design of
  the offline states, 13, is held to it. DW-3 already presumes the answer to
  half of it: a write attempted offline is refused, not queued.
- **Then the cellar to read:** its list and an entry's bottles are designed
  ([02](iteration-12/02-design-the-cellar-list.md),
  [03](iteration-12/03-design-a-cellar-entry-and-its-bottles.md)) and then built
  ([04](iteration-12/04-a-user-sees-their-cellar-on-their-phone.md),
  [05](iteration-12/05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md)),
  so that what the later tasks write is visible.
- **Then adding.** The bottle form
  ([06](iteration-12/06-design-the-bottle-form.md)) and the Add action
  ([07](iteration-12/07-design-the-add-action-and-finding-the-beer-to-add.md))
  are designed; the form is built into the beer's page
  ([08](iteration-12/08-a-user-adds-bottles-of-a-beer-from-its-page.md)) first,
  because it needs no search, and the Add action and the cellar's own entry
  points follow
  ([09](iteration-12/09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md)).
  The tab bar's Add button is one way to add a bottle, and what it does now that
  scanning is dropped is task 07's choice.
- **Then changing and removing,** designed on a device because a swipe is felt
  ([10](iteration-12/10-design-acting-on-a-bottle-edit-and-remove.md)) and built
  as [11](iteration-12/11-a-user-edits-a-bottle.md) and
  [12](iteration-12/12-a-user-removes-a-bottle.md).
- **Then the offline cellar:** how its states look
  ([13](iteration-12/13-design-the-cellar-offline-and-a-write-that-fails.md)),
  the cache that keeps the last-loaded cellar
  ([14](iteration-12/14-the-last-loaded-cellar-is-kept-on-the-phone.md)), the app
  knowing it has no connection
  ([15](iteration-12/15-the-app-knows-when-it-is-offline.md)), and a write
  attempted without one saying so
  ([16](iteration-12/16-a-write-attempted-offline-says-so.md)).
- **Last, writes that show at once** and are put back when the server refuses
  them ([17](iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)),
  after the writes exist, and the whole journey on both platforms
  ([18](iteration-12/18-the-cellars-flows-run-end-to-end-on-both-platforms.md)),
  which reads the `Done when` against the built app.

Scanning a bottle was dropped on 2026-11-20 with [iteration 14](iteration-14.md),
so nothing here leaves room for it: the Add action is a way to add a bottle
without one.
