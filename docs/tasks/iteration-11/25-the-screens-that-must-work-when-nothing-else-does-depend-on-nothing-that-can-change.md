# Task 25: The update-required, maintenance and crash screens depend on nothing that can change under an installed build

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-2, DW-3

## Why

An installed build keeps the screens it shipped with. A build that cannot talk
to the server any more is the one that shows "update required", and it shows
whatever the first release drew for as long as it stays installed. A release
cannot fix it later, and it must work when nothing else does. The crash screen
is the same: it renders outside the app's providers, with translations of its
own, because the error it reports may have come from them.

Today all three are on the theme and bundle their words, so they read well in
light and dark and in both locales. Nothing keeps them that way. A later change
could give one of them a fetched image, a string from the server or a hook
that calls the API, and no test would fail; the property is true by
accident rather than guarded. These are the screens where an accident is
unrecoverable.

## Scope

The update-required, maintenance and crash screens
([`BlockedScreen`](../../../mobile/src/features/app-config/BlockedScreen.tsx),
[`CrashScreen`](../../../mobile/src/features/crash-recovery/CrashScreen.tsx)),
checked in the design language chosen by tasks 02–05 and made to stay
independent of everything that can change under an installed build, in both
modes, both locales and at the largest text size. What each says and does is
today's, with the changes under Constraints.

The independence is enforced, not just observed: a lint boundary fails a
change that gives one of the three screens a dependency outside the bundled set,
and a test renders them with the API client failing.

## Non-goals

- The primitives and every other screen's restyle — [task 08](08-mobile-ui-primitives.md).
  This task consumes `ActionButton` as it stands.
- The mark inside the app, which stays out of the app this iteration
  ([`docs/tasks/backlog.md`](../backlog.md)).
- A link to a store, a store's name, a maintenance duration or a countdown.
- The gate's own logic — when it decides to block, the remembered minimum, the
  polling interval — which [iteration 9 task 12](../iteration-9/12-app-config-endpoint.md)
  built.

## Constraints

- **These screens depend on nothing that can change under an installed build:**
  no fetched font or image, no string from the server, and no token of an API
  the app may no longer understand
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)).
  Their strings are bundled from `@kalia/locales`; the face is bundled, and one
  that fails to load leaves the system face rather than a blank app
  ([ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)).
- **The one string that comes from a failed request is the crash screen's trace
  reference,** which an error shows
  ([ADR-0088](../../adr/0088-both-tiers-log-json-and-share-a-trace-id-and-count-failures-without-a-viewer.md)):
  an identifier printed as it came, never interpreted or acted on. The other two
  screens show none.
- **Built on the theme and `ActionButton` as it stands.** [Task 08](08-mobile-ui-primitives.md)
  owns `ActionButton` and only adds to its props while this task is in flight;
  this task owns `features/app-config`, `features/crash-recovery` and the
  strings they read, and task 08 touches none of them. The two run in parallel
  and either merges first.
- Accessibility in platform terms
  ([ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md)): roles,
  accessible names, tap targets, a title that stops growing at twice its size
  and no fixed height around text.
- Every string in `en` and `fi`
  ([ADR-0011](../../adr/0011-i18next-localization.md)).
- **The iPhone sign-off is counted as
  [the iteration index](../iteration-11.md#the-iphone-sign-off) says.**

**Settled at the 2026-11-13 refinement** (product owner):

- **The crash screen joins this task,** because it has the same property.
- **"Update required" has no link and names no store,** because no store
  listing exists or can be paid for; its words are today's.
- **"Maintenance" gives no duration** — the app cannot tell how long it will
  last. It offers the "Check again" button and checks again by itself when the
  app returns to the foreground, which it already does.
- **Both screens are right in both modes:** the app follows the system
  ([task 04](04-decision-and-design-dark-mode.md)).

## Open questions

**None.**

## Acceptance criteria

- [x] A component test renders "update required", "maintenance" and the crash
      screen in `en` and `fi` with the API client mocked to fail, and shows
      each identical to its rendering with the client working
- [x] A component test renders each screen in light and dark, `en` and `fi`,
      at the largest font scale, finds its heading and its action by role and
      accessible name, and shows its words in full
- [x] A lint test shows the import boundary rejecting a fixture in which one
      of the three screens imports a data hook, the API client or a remote
      image, and accepting the screens as they stand
- [ ] The product owner looked at the three screens in both locales and both
      modes on the route task 01 chose, and signed them off
- [x] `make verify-fast` is green

## Notes

Provenance: split out of [task 08](08-mobile-ui-primitives.md) at the
refinement of 2026-11-13, whose "update required" and "maintenance" screens
carried the one constraint that cannot wait for the rest: they are the screens
that cannot be fixed by a release once installed. The "update required" screen
is iteration 9 [task 12](../iteration-9/12-app-config-endpoint.md)'s.
