# Task 14: A font that fails or never loads leaves the app readable

- **Status:** done
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The app's bundled faces load through `mobile/src/lib/design/FontGate.tsx`,
which renders nothing until `useFonts` resolves or errors. It fails in two
ways:

- **The gate has no deadline.** If a font load never settles, the splash
  screen stays up. That also hides the "update required" and "maintenance"
  screens, which must open when nothing else does. A user on a build the
  server has blocked then sees a splash screen that never ends, with no
  message.
- **The fallback renders at the wrong weight.** When the faces fail to load,
  `textStyle` in `mobile/src/lib/design/fonts.ts` still names a family the
  device does not have and sets no `fontWeight`. The system face then renders
  every title, name and button at regular weight, and the hierarchy the
  identity relies on is gone.

[Iteration 11 task 25](../iteration-11/25-the-screens-that-must-work-when-nothing-else-does-depend-on-nothing-that-can-change.md)
makes the blocked screens depend on nothing that can change under an installed
build. A gate in front of them that can wait forever undoes that.

## Scope

- The font gate renders its children after a deadline even if the load has
  not settled, and the splash screen hides.
- When the bundled faces are not loaded, text renders in the system face with
  the weight each style asks for.
- The blocked and crash screens are reachable with the faces pending, failed
  or loaded.

## Non-goals

- Changing the faces, the type scale or the identity
  ([ADR-0110](../../adr/0110-the-phone-identity-is-colour-fields-set-light-in-a-rounded-face.md)).
- Fetching fonts at runtime. They stay bundled.

## Constraints

- **The independent screens import only what is bundled**
  (`independentScreenFiles` and the `bundled-lib` category in
  `mobile/eslint.config.js`). A change to `lib/design` must keep the
  independence tests green.
- **`expo-font` and `expo-splash-screen` behave as documented for the SDK in
  `mobile/package.json`.** That is checked at docs.expo.dev, never from
  memory, because a wrong guess about when `useFonts` settles fails silently.
- Styling is token-only. The fallback's weights come from the same tokens as
  the bundled faces.
- **Decided at refinement (2026-11-15):**
  - The deadline is three seconds, the same for a cold and a warm start.
  - Faces that load after the deadline are used from the next launch on, so
    text does not change face mid-session.
  - The update-required, maintenance and crash screens sit outside the
    font gate altogether, in the system face with each style's weight.
  - A failed load, or one the deadline overtakes, writes one `WARN` line
    through the app's logger
    ([ADR-0098](../../adr/0098-an-installed-builds-errors-are-read-from-the-devices-own-logs-and-a-crash-service-waits-for-a-second-user.md)).

## Open questions

**None.**

## Acceptance criteria

- [x] A `FontGate.test.tsx` case whose `useFonts` never settles renders the
      children once the three-second deadline passes, under fake timers,
      hides the splash screen and writes one `WARN` line. It failed before the
      change
- [x] A test whose faces load after the deadline keeps the system face for
      the rest of the session
- [x] A test shows `textStyle` with the faces not loaded returning the system
      family and the weight each style asks for
- [x] A test renders the update-required screen while the fonts are still
      pending, with no deadline passed, and the screen is found by its
      heading's role
- [x] On the iOS Simulator, with the bundled faces made to fail, the catalog's
      titles and buttons keep their weight, compared by the agent and
      described in words in the pull request
- [x] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-139 and COULD-141,
both filed from the review of iteration 11's identity work.
