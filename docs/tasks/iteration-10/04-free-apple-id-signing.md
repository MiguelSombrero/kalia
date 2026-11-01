# Task 04: Kalia installs on the product owner's iPhone with a free Apple ID

- **Status:** needs-refinement
- **Iteration:** [10](../iteration-10.md)
- **Covers:** DW-1, DW-3

## Why

Kalia has only ever run on simulators. [ADR-0094](../../adr/0094-the-mobile-app-is-expo-as-a-development-build-with-generated-native-projects-and-no-paid-service.md)
put a physical device out of scope on the reading that installing a
development build on an iPhone needs the Apple Developer Program, which costs a
yearly fee. Xcode can also sign for a device with a free Apple ID's Personal
Team, at the price of an install that expires after seven days and an account
that can do far less. If nobody writes those limits down, a later task plans
on a push notification or a universal link that the account can never
deliver, and the seven-day expiry arrives as a broken app on the morning of a
demo.

## Scope

`mobile/README.md` takes a developer from an iPhone that has never run Kalia
to Kalia installed on it, at no cost: the Personal Team, developer mode,
trusting the developer on the phone, and the build that installs. The routine
for re-signing after the seven-day expiry is written down and carried out
once. What a free Personal Team cannot do is recorded where planning will meet
it.

## Non-goals

- Reaching the stack from the phone — [task 02](02-the-phone-reaches-the-stack.md).
- The release-mode build — [task 05](05-build-variants.md); this task installs
  whichever build it produces first.
- TestFlight, testers and store distribution: parked for cost in
  [the backlog](../backlog.md#mobile-client).

## Constraints

- **No cost, no card on file** (`CLAUDE.md`): the Apple Developer Program, EAS
  Build and any cloud signing service are out.
- ADR-0094 states a physical device is out of scope pending a decision to
  spend; it is amended, not contradicted
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)), to say a free
  Personal Team installs on the developer's own device.
- `ios/` is generated and never committed (ADR-0094), so the team identifier
  and signing settings cannot live in a hand-edited Xcode project; they have to
  survive `expo prebuild`.
- **Nothing from the host machine leaves it** (`CLAUDE.md`): the Apple ID, the
  team identifier, the device's name and its UDID stay out of every commit,
  PR and comment.
- Follows [task 03](03-app-identity.md), whose identifier the first install
  fixes.
- Expo and Xcode signing postdate model training — check docs.expo.dev at the
  SDK version in `mobile/package.json`, and Apple's own pages, never memory.

## Open questions

1. **How the team is supplied.** An `.env` value read by a config plugin or
   by `make mobile-ios-device`, an Xcode step done by hand after each
   prebuild, or `expo run:ios --device` alone — and how the doctor reports a
   missing one.
2. **Where the limits are recorded.** An amendment to ADR-0094, a new section
   of `mobile/README.md`, the [backlog](../backlog.md#mobile-client)'s cost
   list, or more than one of those with one home and pointers
   ([ADR-0020](../../adr/0020-documentation-roles.md)) — and which limits
   matter: seven-day expiry, the three-app limit, no push, no associated
   domains, no TestFlight.
3. **The re-signing routine:** reinstall from a fresh build each time, or
   re-sign the existing one; and whether a reminder is wanted (a calendar
   entry is the product owner's own, never a repository file).
4. **Is a cellar kept across a re-sign?** Reinstalling over an expired app
   keeps its data only if the identifier and team are unchanged; whether the
   README promises that, once seen.
5. **A spare iPhone or a second Apple ID** is not assumed: is "the product
   owner's own iPhone" the only device DW-1 is verified on?

## Acceptance criteria

- [ ] Following `mobile/README.md` from an iPhone that has never run Kalia,
      the app is installed and launches — carried out by the product owner and
      described in the PR without any device or account identifier
- [ ] The re-signing routine is carried out once after an expiry, or by
      revoking the install to simulate one, and the PR says which
- [ ] ADR-0094 is amended to allow a free Personal Team on the developer's
      own device, and the limits are recorded where open question 2 decides
- [ ] Any script or `make` target the routine adds has a test covering its
      missing-team-identifier case
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks;
[backlog](../backlog.md#mobile-client)'s cost list, which names what a paid
account would add.
