# ADR-0116: The phone draws the platforms' own date pickers through the community datetimepicker, at the version the Expo SDK lists

- **Status:** accepted
- **Date:** 2026-11-27

## Context

The bottle form takes two optional dates, and the product owner requires each
platform's own picker for them
([task](../tasks/iteration-12/06-design-the-bottle-form.md)). React Native and
Expo's core ship no date picker, so the app needs a native dependency, which
changes what every development and release build contains. Two packages that the
Expo SDK in use lists as compatible draw the real iOS and Android pickers.

## Decision

The phone draws the platforms' own date pickers through
`@react-native-community/datetimepicker`, pinned to the version the Expo SDK
lists for it.

The version is recorded in `mobile/package.json`. It moves with the SDK, so
Dependabot ignores it like the rest of the SDK's set. The decision covers date
entry only; any other native control is its own choice.

## Alternatives considered

**Expo UI (`@expo/ui`).** Expo's own package, drawing with SwiftUI and Jetpack
Compose and upgraded with the SDK. Rejected: it is a whole UI library, several
megabytes with a worklets peer dependency, taken to get one control.

**A date typed into fields of our own.** No dependency. Rejected: the product
owner asked for the platforms' pickers.

## Consequences

- Good, because the pickers, their languages and their screen reader support are
  the platform's.
- Bad, because the package's maintainers ask for help in its README, so an SDK
  upgrade may find it lagging.
- Bad, because it is native code: every installed development build must be
  rebuilt before the form works.
- Neutral, because Android's picker follows the system's language, not a choice
  of the app's.
- **Revisit trigger:** the SDK stops listing the package, or a platform picker it
  cannot draw is needed.
