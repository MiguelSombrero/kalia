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
| [01](iteration-12/01-decision-how-the-cellar-behaves-offline.md) | Decide how the cellar behaves offline | refined |
| [19](iteration-12/19-a-cellar-has-a-size-limit-the-server-enforces.md) | A cellar has a size limit the server enforces | refined |
| [02](iteration-12/02-design-the-cellar-list.md) | Design the cellar list | refined |
| [03](iteration-12/03-design-a-cellar-entry-and-its-bottles.md) | Design a cellar entry and its bottles | refined |
| [20](iteration-12/20-every-wait-on-the-network-has-a-deadline.md) | Every wait on the network has a deadline | done |
| [04](iteration-12/04-a-user-sees-their-cellar-on-their-phone.md) | A user sees their cellar on their phone | refined |
| [05](iteration-12/05-a-user-opens-a-beer-in-their-cellar-and-sees-its-bottles.md) | A user opens a beer in their cellar and sees its bottles | refined |
| [23](iteration-12/23-a-sheet-puts-voiceovers-focus-on-its-heading.md) | A sheet puts VoiceOver's focus on its heading | refined |
| [06](iteration-12/06-design-the-bottle-form.md) | Design the bottle form | refined |
| [07](iteration-12/07-design-the-add-action-and-finding-the-beer-to-add.md) | Design the Add action and finding the beer to add | refined |
| [22](iteration-12/22-the-clients-take-the-backends-bounds-from-one-place.md) | The clients take the backend's bounds from one place | refined |
| [08](iteration-12/08-a-user-adds-bottles-of-a-beer-from-its-page.md) | A user adds bottles of a beer from its page | refined |
| [09](iteration-12/09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md) | A user finds a beer to add from the Add action or from the cellar | refined |
| [26](iteration-12/26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md) | A user suggests a beer the catalog lacks while adding bottles of it | refined |
| [10](iteration-12/10-design-acting-on-a-bottle-edit-and-remove.md) | Design acting on a bottle — edit and remove | refined |
| [21](iteration-12/21-a-bottle-that-is-already-gone-is-not-a-failure.md) | A bottle that is already gone is not a failure | refined |
| [11](iteration-12/11-a-user-edits-a-bottle.md) | A user edits a bottle | refined |
| [12](iteration-12/12-a-user-removes-a-bottle.md) | A user removes a bottle | refined |
| [13](iteration-12/13-design-the-cellar-offline-and-a-write-that-fails.md) | Design the cellar offline and a write that fails | refined |
| [14](iteration-12/14-the-last-loaded-cellar-is-kept-on-the-phone.md) | The last-loaded cellar is kept on the phone | refined |
| [15](iteration-12/15-the-app-knows-when-it-is-offline.md) | The app knows when it is offline | refined |
| [16](iteration-12/16-a-write-attempted-offline-says-so.md) | A write attempted offline says so | refined |
| [17](iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md) | A write the server rejects leaves the screen as it was | refined |
| [24](iteration-12/24-a-rejection-reason-added-in-catalog-cannot-lose-a-notification.md) | A rejection reason added in catalog cannot lose a notification | refined |
| [25](iteration-12/25-keycloak-holds-the-web-client-to-the-redirects-and-the-pkce-it-uses.md) | Keycloak holds the web client to the redirects and the PKCE it uses | refined |
| [18](iteration-12/18-the-cellars-flows-run-end-to-end-on-both-platforms.md) | The cellar's flows run end to end on both platforms | refined |

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
  the offline states, 13, is held to it. Refinement settled it on 2026-11-22, so
  13–17 were refined with it: a persisted read cache, with a write attempted
  offline refused, not queued; task 01 records it as an ADR.
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
  The tab bar's Add button opens one Add form, beer first: a catalog search,
  already filled in on a beer's page, that goes on to suggest a beer the
  catalog lacks, which is built last
  ([26](iteration-12/26-a-user-suggests-a-beer-the-catalog-lacks-while-adding-bottles-of-it.md)).
  How it looks is task 07's choice.
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
- **Last, edits and removals that show at once** and are put back when the
  server refuses them ([17](iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)),
  after the writes exist, and the whole journey on both platforms
  ([18](iteration-12/18-the-cellars-flows-run-end-to-end-on-both-platforms.md)),
  which the closing pull request's check of the `Done when` reads.

Tasks 19–25 were lifted from the [quality backlog](quality-backlog.md) on
2026-11-22, chosen as the findings with the most effect on what a user of the
cellar meets, and each takes the place in the table that its dependants need
rather than the end. They advance no `Done when` criterion of their own
(`Covers: none`) but make the ones above hold:

- **A bound before the cellar is written to.** [19](iteration-12/19-a-cellar-has-a-size-limit-the-server-enforces.md)
  caps what one account can hold while no client writes yet, so the refusal is
  not a new error for an installed app; it follows the offline decision it
  constrains. [22](iteration-12/22-the-clients-take-the-backends-bounds-from-one-place.md)
  gives the clients one home for the backend's bounds before the bottle form
  adds one more copy.
- **A phone that does not freeze.** [20](iteration-12/20-every-wait-on-the-network-has-a-deadline.md)
  gives every request a deadline before the first screen that reads the cellar
  is built, and [23](iteration-12/23-a-sheet-puts-voiceovers-focus-on-its-heading.md)
  settles where a sheet puts a screen reader's focus before the cellar's sheets
  are designed.
- **Writes that agree across clients.** [21](iteration-12/21-a-bottle-that-is-already-gone-is-not-a-failure.md)
  decides what a bottle that is already gone means before the phone builds
  [edit](iteration-12/11-a-user-edits-a-bottle.md) and
  [removal](iteration-12/12-a-user-removes-a-bottle.md); both follow it, as does
  [17](iteration-12/17-a-write-the-server-rejects-leaves-the-screen-as-it-was.md)'s
  `404`.
- **Silent failures, closed.** [24](iteration-12/24-a-rejection-reason-added-in-catalog-cannot-lose-a-notification.md)
  and [25](iteration-12/25-keycloak-holds-the-web-client-to-the-redirects-and-the-pkce-it-uses.md)
  are independent of the cellar and sit before the closing task, which still
  reads the whole iteration last.

Scanning a bottle was dropped on 2026-11-20 with [iteration 14](iteration-14.md),
so nothing here leaves room for it: the Add action is a way to add a bottle
without one.
