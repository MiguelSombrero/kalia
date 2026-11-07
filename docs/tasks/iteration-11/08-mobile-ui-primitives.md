# Task 08: The app has its own primitives, and no screen is left plain

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-2, DW-3

## Why

The design chosen in tasks [02](02-design-the-interaction-model-and-navigation.md)
to [05](05-design-motion-and-haptics.md) reaches a user only through components,
and the app has `ActionButton` and `ErrorReference`. [Iteration 9](../iteration-9.md)
left every other screen plain on purpose: the four tabs' shell, the Profile
tab's sign-in states, the catalog's loading, error and empty states, and the
"update required" and "maintenance" screens.

The last two matter most. An installed build keeps the screens it shipped with:
a build that cannot talk to the server any more is the one that shows "update
required", and it will show whatever the first release drew for as long as it
stays installed. They cannot be fixed later by a release, and they must work
when nothing else does.

## Scope

The app's primitives in native form — buttons, rows, sheets, and the empty,
loading and error states — and the beer and person slots
([ADR-0065](../../adr/0065-imagery-icons-and-mark-specimen.md)), built on the
generated theme. Every screen that exists is restyled with them: the tab shell,
the Profile tab's signed-out, signing-in and signed-in states, the catalog's
loading, error and empty states, and the "update required" and "maintenance"
screens.

## Non-goals

- The catalog's search, paging and filters — [task 09](09-catalog-search-and-list.md);
  a beer's page — [task 10](10-beer-details.md).
- A shared component package: the primitives are the app's own
  ([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md),
  as [task 06](06-decision-the-design-token-format.md) leaves it).
- Choosing how anything looks, which tasks 02–05 did. A primitive whose look
  they left open is a question for the product owner here.

## Constraints

- Tokens only, checked by [task 07](07-token-pipeline.md)'s check.
- Loading, error and empty are states of a component, not afterthoughts
  ([ADR-0022](../../adr/0022-loading-error-empty-states.md)); an error shows its
  reference ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)).
- **"Update required" and "maintenance" depend on nothing that can change under
  an installed build:** no fetched font or image, no string from the server,
  and no token of an API the app may no longer understand
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
  Their strings are bundled from `@kalia/locales`.
- Accessibility in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): roles,
  accessible names, tap targets, and no fixed height around text.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).

**Settled at the 2026-11-07 refinement** (product owner); the task is refined
once the design tasks' ADRs land:

- **Every primitive and screen is right in both modes;** the app has a dark
  mode that follows the system
  ([task 04](04-decision-and-design-dark-mode.md)), "update required" and
  "maintenance" included.

## Open questions

- **Interaction and UX.** Whether any primitive needs a built-alternatives round
  of its own (the sheet and the empty states are the likely ones) or tasks
  02–05 settle all of them.
- **Edge cases.** What "maintenance" shows when the app cannot tell how long it
  will last, and whether "update required" links to a store that does not yet
  exist for the owner's own build.
- **Terminology.** The primitives' names, and which web names they share.

## Acceptance criteria

- [ ] A component test per primitive shows each of its states — and, for a
      row, a long Finnish name at the largest font scale — rendering without
      truncating its meaning
- [ ] A component test renders "update required" and "maintenance" with the
      API client mocked to fail, and shows them identical to the rendering with
      it working
- [ ] No screen under `mobile/src/app` or `mobile/src/features` styles itself
      outside the primitives and the theme — the token check passes
- [ ] The product owner looked at every restyled screen on the route task 01
      chose, and the "update required" and "maintenance" screens in both
      locales, and signed them off
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Mobile UI primitives").
The "update required" screen is iteration 9
[task 12](../iteration-9/12-app-config-endpoint.md)'s.
