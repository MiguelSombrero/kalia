# Iteration 10 — Kalia on your own iPhone

Goal: Kalia runs on the product owner's physical iPhone against the stack on
their Mac, signed with a free Apple ID, and reinstalling it every seven days is
a documented routine rather than a surprise.

## Done when

- **DW-1:** `mobile/README.md` takes a developer from a clean iPhone to Kalia
  installed on it, at no cost.
- **DW-2:** On the phone, Kalia signs in against the Keycloak running on the
  Mac and browses the catalog served from it, without breaking the browser or
  simulator setup.
- **DW-3:** The routine for re-signing after the free Apple ID's seven-day
  expiry is written down and has been carried out once.
- **DW-4:** A release-mode build — bundled JavaScript, no dev menu — runs on
  both the iPhone and the Android emulator.
- **DW-5:** How a real phone reaches the Mac, and where app errors are visible
  without a paid service, are each a recorded decision.

## Tasks

| ID | Task | Status |
|---|---|---|
| [07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md) | The mobile end-to-end check fails only when the app does | refined |
| [09](iteration-10/09-the-checks-reach-mobile.md) | The repository's own checks reach `mobile/` as they reach `web/` | done |
| [20](iteration-10/20-process-records-match-practice.md) | The process's own rules and records match how work is done | refined |
| [01](iteration-10/01-decision-how-a-phone-reaches-the-mac.md) | Decide how a real phone reaches the stack on the Mac | done |
| [06](iteration-10/06-decision-error-visibility.md) | Decide where the app's errors are visible without a paid service | done |
| [10](iteration-10/10-the-edge-serves-only-what-a-client-needs.md) | The edge serves only what a client needs | refined |
| [11](iteration-10/11-the-deployable-stack-carries-no-dev-convenience.md) | The deployable stack carries no dev convenience and no shared superuser | refined |
| [12](iteration-10/12-every-image-the-stack-runs-is-scanned.md) | Every image the stack runs is scanned, and a mirror outage is not a finding | refined |
| [03](iteration-10/03-app-identity.md) | Kalia has its own name, icon and splash screen on a phone | refined |
| [04](iteration-10/04-free-apple-id-signing.md) | Kalia installs on the product owner's iPhone with a free Apple ID | needs-refinement |
| [02](iteration-10/02-the-phone-reaches-the-stack.md) | The phone signs in and browses against the stack on the Mac | needs-refinement |
| [05](iteration-10/05-build-variants.md) | A development build and a release build run on both platforms | needs-refinement |
| [21](iteration-10/21-an-error-on-a-phone-leaves-something-to-read.md) | An error on a phone leaves something to read | refined |
| [08](iteration-10/08-the-app-survives-a-token-it-cannot-use.md) | The app survives a token it cannot refresh or the server refuses | refined |
| [13](iteration-10/13-cellar-survives-a-concurrent-change.md) | A cellar read or write never answers 500 under a concurrent change | refined |
| [14](iteration-10/14-the-owner-cellar-read-is-bounded.md) | The owner's cellar read has a bound before the app caches it | refined |
| [15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md) | A rejected or removed beer is treated the same way everywhere | refined |
| [16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md) | Adding a beer says what happens to it, and never dead-ends | refined |
| [17](iteration-10/17-web-sign-in-is-one-helper.md) | Web sign-in is one helper, and a cross-site link cannot sign anyone out | refined |
| [18](iteration-10/18-each-fact-kept-once.md) | The architecture diagram, feature list and limits are each kept once | refined |
| [19](iteration-10/19-docs-and-comments-say-what-is-true.md) | The documentation and comments say what is true now | refined |

Tasks 01–06 are the ones this iteration was planned with, and 21 was filed
at refinement to implement 06's decision; 07–20 were lifted
from the [quality backlog](quality-backlog.md) at the product owner's request
to fill the iteration, with related findings merged into one task each. All
twenty were seeded at `needs-refinement` and refined together in one
conversation ([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)),
below.
The quality tasks advance no `Done when` criterion and say so with
`Covers: none`.

The table's order is the order of work:

- **The gates first.** [07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md)
  makes the required Android end-to-end check fail only when the app does,
  before this iteration's build work leans on it hardest;
  [09](iteration-10/09-the-checks-reach-mobile.md) carries the comment check
  and Dependabot's grouping to `mobile/`; and
  [20](iteration-10/20-process-records-match-practice.md) fixes the worktree
  routine every later task uses. Its after-merge-criteria question is settled
  at refinement, since the answer shapes how this iteration's own criteria are
  worded.
- **Then the two decisions,** [01](iteration-10/01-decision-how-a-phone-reaches-the-mac.md)
  and [06](iteration-10/06-decision-error-visibility.md), because the build
  tasks inherit their answers. Each has to be accepted before the tasks it
  binds are refined, as in [iteration 9](iteration-9.md).
- **Then what a reachable stack exposes:** [10](iteration-10/10-the-edge-serves-only-what-a-client-needs.md),
  [11](iteration-10/11-the-deployable-stack-carries-no-dev-convenience.md) and
  [12](iteration-10/12-every-image-the-stack-runs-is-scanned.md). Until now
  only the Mac's loopback reached the stack; task 01 puts it on a network, and
  its admin console, metrics and unscanned images should not arrive there
  first.
- **Then the phone,** in the order a first install forces:
  [03](iteration-10/03-app-identity.md) fixes the identifier before
  [04](iteration-10/04-free-apple-id-signing.md) installs under it,
  [02](iteration-10/02-the-phone-reaches-the-stack.md) connects the installed
  app to the Mac, [05](iteration-10/05-build-variants.md) lets it run without
  Metro, [21](iteration-10/21-an-error-on-a-phone-leaves-something-to-read.md)
  leaves a release build's errors something to read, and [08](iteration-10/08-the-app-survives-a-token-it-cannot-use.md)
  keeps it working when Keycloak is slow on a real network.
- **Then the API mobile is about to inherit,** while it can still change:
  [13](iteration-10/13-cellar-survives-a-concurrent-change.md),
  [14](iteration-10/14-the-owner-cellar-read-is-bounded.md) and
  [15](iteration-10/15-a-withheld-beer-is-withheld-consistently.md) settle what
  [iteration 12](iteration-12.md)'s offline cache and replayed writes will
  rely on, and [16](iteration-10/16-adding-a-beer-says-what-happens-to-it.md)
  finishes the contribution flow that open registration on a phone will
  grow.
- **Last, the web and the docs:** [17](iteration-10/17-web-sign-in-is-one-helper.md),
  then [18](iteration-10/18-each-fact-kept-once.md) and
  [19](iteration-10/19-docs-and-comments-say-what-is-true.md), which come last
  because every earlier task edits the documents they correct.

Left in the backlog on purpose, as not touching this iteration's work or too
small to stand alone: COULD-26, COULD-75, COULD-77, COULD-79, COULD-81,
COULD-83, COULD-95, COULD-97, COULD-98 and COULD-100. SHOULD-80 and COULD-99,
about the SQL moderation script, were lifted and then returned at the product
owner's review: an admin page planned for a later iteration replaces the
script, so they are to be fixed there rather than in it.

This comes before the design work in [iteration 11](iteration-11.md) on
purpose. Signing and device networking are where a first mobile project loses
days, which is cheaper to find out with almost nothing built; and a design
judged by hand needs a real phone — the simulator has no haptics and no
camera, and no thumb.

## Refinement

The iteration was refined in one conversation on 2026-11-01. Each answer is
recorded in the task file it binds; three bind more than one task and live
here:

- **Every acceptance criterion is checkable before its pull request merges**
  ([task 20](iteration-10/20-process-records-match-practice.md)'s answer to
  COULD-91). This iteration's criteria were worded to it: the seven-day
  re-sign can be simulated by revoking the install, the ten end-to-end runs
  happen on the PR's own branch, and the first look at the icon on the iPhone
  is [task 04](iteration-10/04-free-apple-id-signing.md)'s, not
  [task 03](iteration-10/03-app-identity.md)'s.
- **New dependencies' versions are proposed at implementation** — Tailscale
  ([01](iteration-10/01-decision-how-a-phone-reaches-the-mac.md),
  [02](iteration-10/02-the-phone-reaches-the-stack.md)) and the cache Actions
  ([07](iteration-10/07-mobile-e2e-fails-only-when-the-app-does.md)) —
  confirmed from registry or marketplace output, pinned as the manifests
  already pin theirs, and agreed by the product owner in that task's PR before
  it merges.
- **Phone mode** ([task 01](iteration-10/01-decision-how-a-phone-reaches-the-mac.md)):
  an opt-in mode in which the stack is reached over the product owner's
  tailnet under one origin. The tasks after 01 use the term.

[Task 02](iteration-10/02-the-phone-reaches-the-stack.md),
[04](iteration-10/04-free-apple-id-signing.md) and
[05](iteration-10/05-build-variants.md) carry their answers already but stay
`needs-refinement` until [task 01](iteration-10/01-decision-how-a-phone-reaches-the-mac.md)'s
ADR is accepted, as iteration 9's build tasks waited for theirs; a short
second pass then moves them. [Task 21](iteration-10/21-an-error-on-a-phone-leaves-something-to-read.md)
follows [06](iteration-10/06-decision-error-visibility.md)'s ADR but needs
nothing from it that refinement did not already settle.
