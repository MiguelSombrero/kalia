# Iteration 11 — Mobile design language, proven on the catalog

Goal: Kalia gets a mobile design of its own — chosen from prototyped
directions the way [iteration 7.5](iteration-7.5.md) chose the web's, not a
copy of the web — and proves it by building the first real feature with it:
browsing and searching the catalog.

## Done when

- **DW-1:** Kalia's mobile interaction model and its identity on a phone are
  ones the product owner picked from built alternatives, judged on a phone.
- **DW-2:** One platform-neutral token source generates both the web's CSS
  custom properties and the mobile theme, and styling outside it fails the
  build on both.
- **DW-3:** The catalog — search, filters and a beer's details — works on both
  platforms using the platforms' own conventions rather than the web's.
- **DW-4:** The catalog screens work with VoiceOver and TalkBack and at the
  largest Dynamic Type size, and how that is checked is written down.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)); the design
tasks run under the `design-task` skill
([ADR-0062](../adr/0062-a-design-task-is-a-skill-and-a-marker.md)).

- **Design: interaction model and navigation** — the tab structure, whether a
  central add/scan action exists, sheets versus pushed screens, gestures.
- **Design: Kalia's identity on a phone** — "Can art, square"
  ([ADR-0064](../adr/0064-visual-identity-can-art-square.md)) in native terms:
  type that scales with Dynamic Type, density, the style-group colours.
- **Decision and design: dark mode** — whether, and if so its palette, held to
  the contrast checker.
- **Design: motion and haptics** — what moves, what is felt, and respecting
  reduce-motion.
- **Decision: the design token format** — one platform-neutral source for both
  platforms, building on [iteration 7.5 task 12](iteration-7.5/12-do-we-need-a-design-system.md).
- **Token pipeline** — implementing that decision, with
  [ADR-0066](../adr/0066-token-only-styling-is-a-build-check.md)'s check
  extended to mobile.
- **Mobile UI primitives** — buttons, rows, sheets, empty/loading/error
  states, and the beer and person slots
  ([ADR-0065](../adr/0065-imagery-icons-and-mark-specimen.md)) in native form.
- **Catalog search and list** — infinite scroll, search as you type, filters
  in a sheet.
- **Beer details.**
- **Mobile accessibility conventions** — written down and checked in tests.

The `design-task` skill's prototypes are web Artifacts today. A mobile
direction has to be judged at phone size and ideally in the hand, so the first
design task here also settles how a mobile direction is prototyped — framed
Artifacts, builds on the device, or both.
