# Task 16: The seven-day signing expiry is watched, and what it does is written down

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

The app on the product owner's iPhone is signed with a free Apple ID, so the
install stops opening seven days after its profile is issued.
[Iteration 10 task 04](../iteration-10/04-free-apple-id-signing.md) shipped
the re-signing routine without anyone having watched it. Both
`mobile/README.md` ("Re-signing after seven days") and the
[backlog](../backlog.md#mobile-client) say that nobody has seen an expiry or a
re-sign. They also say that what the app does at expiry, and whether its data
survives a re-sign, is written down only once someone has. The first install
was on 2026-11-04, so at least one expiry has come and gone.

The answer matters most for iteration 12. Its cellar is persisted on the
device so that it can be read with no signal. If a re-sign wipes the app's
storage or its Keychain items, the offline cellar and the sign-in are lost
every week, and the design has to know that before it is built. Nothing today
tells the developer when the current install will lapse either. They find out
when the app does not open.

## Scope

- An expiry is watched on the phone and a re-sign is done by the documented
  routine. What the app shows at expiry, and whether the sign-in and any
  stored data survive the re-sign, is recorded.
- `mobile/README.md` states what was observed, replacing "Unobserved", and
  the backlog's note that the first expiry is still to be observed is
  removed.
- A command tells the developer when the installed or last-built profile
  expires.

## Non-goals

- Paid signing, TestFlight or anything else the
  [backlog](../backlog.md#mobile-client) parks behind the Apple Developer
  Program.
- Changing how the app stores data. If the re-sign loses data, iteration 12's
  offline decision takes that as an input.

## Constraints

- **Kalia adds no cost** ([CLAUDE.md](../../../CLAUDE.md)). The routine stays
  on a free Apple ID.
- **Nothing from the host machine leaves it.** The profile's team id, the
  device's name and its UDID stay out of the pull request and the docs
  ([rule](../../../.claude/rules/no-screenshots.md)). Only the observation is
  recorded, in words.
- **Every criterion is checkable before merge**
  ([template](../template.md#acceptance-criteria)). If no lapsed install is at
  hand when the task starts, it waits for one, or the lapse is produced by
  moving the phone's date forward, as refinement decides.

## Open questions

- **Completion signals.** Is the expiry watched on a lapsed install, or by
  moving the phone's date forward? Does a date-forced lapse count as the
  "first real expiry" the backlog asks for?
- **Functional scope.** Should the expiry date be printed by
  `make mobile-doctor`, by the build target after it installs, or by both? And
  should it warn when the date is a day away?
- **Edge cases.** Does a development build installed over a release build, or
  the other way round, reset the seven days or keep the data? The README
  states the second for one direction only.

## Acceptance criteria

- [ ] The product owner watches an expiry and a re-sign on the phone. The
      pull request records in words what the app showed, and whether the
      sign-in and stored data survived
- [ ] `mobile/README.md`'s re-signing section states the observation, and
      the backlog's "first real expiry is still to be observed" is gone
- [ ] A script test reads a fixture provisioning profile and reports its
      expiry date, and the command refinement chooses prints it for the
      real build
- [ ] `make verify-fast` is green

## Notes

Provenance: the [backlog](../backlog.md#mobile-client)'s Apple Developer
Program item, whose seven-day line asks for this observation. Placed before
iteration 12's offline decision, which depends on what a re-sign keeps.
