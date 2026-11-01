# Task 04: Kalia installs on the product owner's iPhone with a free Apple ID

- **Status:** refined
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
  PR and comment. ADR-0097 puts the tailnet host name in the same place, the
  root `.env`.
- Follows [task 03](03-app-identity.md), whose identifier the first install
  fixes, and [task 01](01-decision-how-a-phone-reaches-the-mac.md)'s
  [ADR-0097](../../adr/0097-a-phone-reaches-the-stack-over-the-owners-tailnet-in-an-opt-in-phone-mode-where-one-origin-is-the-issuer.md),
  whose phone mode [task 02](02-the-phone-reaches-the-stack.md) builds after
  this task, not before it.
- Expo and Xcode signing postdate model training — check docs.expo.dev at the
  SDK version in `mobile/package.json`, and Apple's own pages, never memory.

**Decided at refinement, 2026-11-01** (product owner):

- **The team is supplied from the root `.env`:** the Apple Team ID, never
  committed, reaches prebuild through the Expo config so it survives
  `expo prebuild`; `make mobile-doctor` names it when it is missing; a new
  `make mobile-ios-device` builds and installs on the phone.
- **The free account's limits have one home, the
  [backlog](../backlog.md#mobile-client)'s cost list:** the seven-day expiry,
  three apps per device, no push, no universal links and no TestFlight.
  ADR-0094's amendment and `mobile/README.md`'s re-signing routine point to it.
- **Re-signing is a rebuild and reinstall from source.** A reminder is the
  product owner's own calendar entry, never a repository file.
- **Whether the cellar survives a re-sign:** the README states what the DW-3
  run observed, and promises nothing more.
- **The product owner's own iPhone is the only device** DW-1 and DW-3 are
  verified on.
- The first install fixes [task 03](03-app-identity.md)'s identifier; if a
  free Personal Team cannot register it, this task stops and returns to the
  product owner.

**Decided at the second refinement pass, 2026-11-01** (product owner, after
ADR-0097 was accepted):

- **This install is made before phone mode exists,** because task 02 follows
  this task in the iteration's order. It is a development build in the default
  mode, whose origins are `localhost` and whose Metro host is `localhost`
  (`scripts/mobile-env.mjs`); on a phone both name the phone itself. So it is
  expected to **install and open, to the app or to the development launcher or
  its "could not connect to Metro" screen, and not to sign in or list beers:**
  that is DW-2 and task 02's, as is Metro's route to the phone in phone mode,
  which ADR-0097 does not name among the three ports it forwards. This task's
  evidence needs the splash screen, the home-screen icon and the name, none of
  which needs a stack or Metro.
- **Task 02's build installs over this one.** The identifier and the Personal
  Team are the same, so the phone treats it as an update that keeps the app's
  data, not a second app. ADR-0097 makes an installed app built for one mode,
  so the re-signing routine rebuilds in whichever mode the root `.env` is in
  and the README says to check it first.
- **No tailnet is needed to install.** The install runs over the cable or the
  local network Xcode pairs with, and Tailscale is task 02's dependency, not
  this one's.

## Open questions

**None.**

## Acceptance criteria

- [ ] Following `mobile/README.md` from an iPhone that has never run Kalia,
      the app is installed and opens, to the app or to the development
      launcher, without a stack or a tailnet — carried out by the product
      owner and described in the PR without any device or account identifier
- [ ] That first install registers `fi.kalia.app` under the Personal Team
      before any other Kalia build is installed on the phone, and shows task
      03's icon, name and splash screen — the PR says so, from the product
      owner's run
- [ ] The re-signing routine is carried out once by revoking the install to
      simulate the seven-day expiry, which cannot arrive before the PR merges;
      the PR says what was revoked, what the app did afterwards, whether the
      cellar survived (DW-3), and `mobile/README.md` states only that
- [ ] ADR-0094 is amended to allow a free Personal Team on the developer's
      own device, and the limits are recorded in the backlog's cost list with
      pointers from ADR-0094 and `mobile/README.md`
- [ ] The Apple Team ID is read from the root `.env`, reaches prebuild through
      the Expo config, and appears in the PR diff only as the variable's name
      with no value
- [ ] A test covers the missing-team-identifier case of every script or `make`
      target the routine adds, including `make mobile-doctor` naming it and
      `make mobile-ios-device` refusing to build without it
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 10](../iteration-10.md)'s planned tasks;
[backlog](../backlog.md#mobile-client)'s cost list, which names what a paid
account would add.
