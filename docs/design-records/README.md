# Design records

One file per design task: what a surface had to answer, the directions shown,
the one the product owner chose, and why each other lost. A design record holds
the *why* of how one surface looks and behaves, the way an ADR holds the why of
an architectural decision. A choice of this kind is not an ADR, by
[ADR-0032](../adr/0032-when-a-decision-earns-an-adr.md)'s fourth test; the
`design-task` skill writes the record
([ADR-0062](../adr/0062-a-design-task-is-a-skill-and-a-marker.md)).

- **Format:** [template.md](template.md). A record is named after its task,
  `iteration-N-NN-<slug>.md`, so it needs no number of its own.
- **Standing intent goes elsewhere.** What later tasks are held against is
  [`docs/design.md`](../design.md); values are the token source.
- **An architectural part splits off.** If the choice also fixes what an
  endpoint returns, adds a build check or a dependency, that part is an ADR,
  or an amendment of the ADR it touches, and the record links it.
- **A record is amended, not rewritten**, as an ADR is
  ([ADR-0019](../adr/0019-adr-format-and-conventions.md)). A later task that
  changes the choice writes its own record, and this one becomes
  `superseded` with a `Superseded-by` line.
- **Choices made before 2026-11-13 are ADRs**, grouped under
  [Design choices recorded as ADRs](../adr/README.md#design-choices-recorded-as-adrs).
  A record that changes one names it in `Departs from`.

## Records

Add a line when adding a record: its link, then the choice in one clause.

- [Iteration 11 task 22, mobile tab icons](iteration-11-22-mobile-tab-icons.md) — Shine bubbles, a bottle and a barrel, filled on a soft pill when selected
- [Iteration 11 task 23: the Catalog's search and filters](iteration-11-23-catalog-search-and-filters.md) — a search field and Filters button with removable chips, and a sheet whose style, brewery and country are pushed, searchable pickers (direction A).
