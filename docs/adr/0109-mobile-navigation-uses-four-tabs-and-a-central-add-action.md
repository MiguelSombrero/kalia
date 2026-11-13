# ADR-0109: Mobile navigation uses four tabs and a central Add action

- **Status:** accepted
- **Date:** 2026-11-09
- **Amended:** 2026-11-13 by [design record](../design-records/iteration-11-22-mobile-tab-icons.md) — the tab icons are no longer placeholders

## Context

The mobile app's initial tabs were scaffolding rather than a chosen
interaction model. Navigation must leave a stable home for the catalog,
cellar, feed, profile and future bottle scan while respecting native
platform conventions and accessible alternatives to gestures.

## Decision

**Mobile navigation uses Feed, Catalog, a central Add action, Cellar and Profile in that order, with filters and beer details presented as sheets.**

The Add action opens a sheet that explains scanning is not yet available and
offers the catalog as the usable route. A signed-out visitor sees a cellar
invitation and can start sign-in from its context; sign-in still uses the
system browser under [ADR-0095](0095-the-mobile-app-signs-in-as-a-public-pkce-client-holds-an-offline-token-and-calls-spring-directly-through-the-edge.md).
Sheets have an explicit close action as well as native dismissal. Android
Back dismisses or pops first, then returns to Catalog, then exits. Tab icons
in the prototypes are placeholders; their design is
[task 22](../tasks/iteration-11/22-design-mobile-tab-icons.md). Individual
screen details are designed in their own tasks.

## Alternatives considered

**A: four equal tabs.** Catalog, Cellar, Feed and Profile were always visible;
filters used a sheet and beer details a pushed screen. The product owner
preferred the central Add action and the sheet presentation of beer details
shown by B, while retaining A's filter sheet.

**B: Add in the middle.** Catalog and Cellar preceded the central Add action,
with Feed and Profile after it. Filters were pushed and beer details used a
sheet. The owner preferred A's filter sheet and a Feed-first order.

**C: three destinations and account control.** Catalog, Cellar and Community
were tabs, with Profile in the header and filters and details pushed. The owner
preferred B's central Add and beer-detail sheet and A's filter sheet.

**D: Feed first, Add in the middle.** A second framed round combined B's Add
and beer-detail sheets with A's filter sheet, reordering the destinations as
the owner requested. The owner carried D to native exploration and approved it
on the iPhone. The other directions were not carried forward.

## Consequences

- Good, because the primary destinations remain visible and adding has a
  consistent entry point before scanning exists.
- Neutral, because native platforms present the same structure in their own
  chrome; the Android prototype needed taller, scrollable content to expose
  the filter and detail controls.
- Bad, because a central action occupies tab-bar space without being a
  destination, and contextual sign-in must preserve navigation across the
  external authentication callback.

## Evidence

The first framed round showed A, B and C; a second showed D. The owner reviewed
D on the iOS Simulator, found its Android emulator presentation acceptable,
and approved D on their iPhone in phone mode on 2026-11-09. The built app's
navigation was approved on the iPhone on 2026-11-10. In the VoiceOver walk,
the owner requested that Add identify the beer being added and observed that
opening its sheet focused a gearwheel in the development build; otherwise
the walk looked good. The owner reported a gray shape beneath the Add circle
and chose to defer it as
[COULD-138](../tasks/quality-backlog.md#could).
