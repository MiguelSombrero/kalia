# Task 11: The app has four tabs and the web's conventions

- **Status:** needs-refinement
- **Iteration:** [9](../iteration-9.md)
- **Covers:** DW-1

## Why

Every feature from [iteration 11](../iteration-11.md) on lands in an app shell,
and the conventions that shell starts with are the ones features copy. The web
learned several of its conventions the hard way — data fetching behind
feature-owned hooks ([ADR-0041](../../adr/0041-tanstack-query-feature-owned-hooks.md)),
UI state in Zustand, forms through react-hook-form and Zod, strings through
i18next, import boundaries enforced per feature. Starting the app without them
means relearning each one.

## Scope

An Expo Router app in `mobile/` with four tabs — Feed, Catalog, Cellar,
Profile — over placeholder screens, safe areas handled, and the web's
conventions in place and enforced: TanStack Query behind feature hooks,
Zustand, react-hook-form with Zod, i18next following the device locale, and
import boundaries per feature.

## Non-goals

- The design of the app — [iteration 11](../iteration-11.md) gives it a
  design language; this task is deliberately plain.
- Real data on any screen — [task 15](15-walking-skeleton-slice.md).
- Sign-in — [task 14](14-sign-in-on-mobile.md).

## Constraints

- Tasks [02](02-decision-the-mobile-stack.md),
  [03](03-decision-repo-layout-and-code-sharing.md) and
  [06](06-decision-mobile-testing-strategy.md) decide the stack, where it
  lives and how it is tested.
- **Expo and React Native postdate model training** — check the installed
  version's documentation before relying on memory about Expo Router.
- [ADR-0075](../../adr/0075-the-accessibility-bar-is-wcag-2-2-aa.md) sets the
  web's accessibility bar.

## Open questions

1. **Does WCAG 2.2 AA apply to the app**, or does the app need a bar of its
   own stated in platform terms (VoiceOver, TalkBack, Dynamic Type)?
2. **The tab labels in en and fi**, and whether the Profile tab shows a sign-in
   prompt when signed out or is hidden.
3. **What does a placeholder screen say?** A user — the product owner on a
   simulator — reads it.
4. **The locale fallback** when the device is in neither English nor Finnish.
5. **Light and dark mode** — follow the system now, or light only until
   iteration 11?
6. **Portrait only**, or every orientation from the start?

## Acceptance criteria

- [ ] The app launches on both simulators to four tabs, each reachable and
      labelled in the device's language — verified on both, described in the
      PR
- [ ] A unit test renders each tab's screen and finds its heading, in English
      and in Finnish
- [ ] A lint rule fails when one feature imports another's internals —
      confirmed by a test fixture or a deliberately broken import
- [ ] `make verify-fast` runs and passes the mobile checks
