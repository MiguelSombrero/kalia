# Task 02: The app as it stands, audited

- **Status:** needs-refinement
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-5

## Why

Four layout tasks follow this one, and without a baseline each of them opens by
deciding for itself what is wrong with its page. That produces four private
problem statements, four different standards for "fixed", and no way to tell
afterwards whether the redesign addressed anything or merely moved it.

It also misses the findings that no single-page task can see. Spacing that
differs per page, a heading scale that is not a scale, a `Card` used to mean
three different things, a control that behaves one way in the catalog and
another in the cellar — these are visible only when the pages are looked at
together, and a task scoped to one page is structurally unable to find them.
The header is the plainest example: it is an unconstrained flex row that wraps
at narrow widths, and every page picks its own padding beneath it, so no page
is individually wrong.

There is a usability half too, and the product owner asked for it explicitly.
The app has never been walked through as a user — only built feature by
feature, each verified against its own acceptance criteria. Nobody has sat
down and tried to *use* Kalia end to end at a phone width.

## Scope

A recorded baseline of the app as it stands today, covering every surface a
visitor can reach, at a phone width and a desktop width: what it looks like,
and what is wrong with it. Findings are visual and usability problems, each
with an identifier a later task can cite, each stating what is wrong rather
than what to do about it.

The surfaces: front page, catalog list with filters and pagination, a beer's
details, an empty cellar and a populated one, a public cellar, a profile,
sign-up, and the shared loading, empty, error and not-found states.

## Non-goals

- Fixing anything. Every finding is fixed — or explicitly not fixed — by the
  task that owns the surface it is on.
- Proposing a design. What replaces a bad layout is
  [task 03](03-visual-identity.md) onwards; a finding that names a solution has
  pre-empted the prototyping this iteration exists to do.
- An accessibility audit. WCAG 2.1 AA is already enforced at lint, unit and E2E
  time ([architecture.md §5](../../architecture.md)), and re-verifying it
  *after* the redesign is [task 13](13-accessibility-and-contrast-reverified.md).
  A finding that happens to be an accessibility problem is still worth
  recording, but this task is not running that pass.
- Backend or data findings. The audit looks at what a visitor sees.

## Constraints

- The audit describes the app **as `dev` has it**, not as this branch has it.
  It depends on [iteration 6.5](../iteration-6.5.md) and
  [iteration 7](../iteration-7.md) having landed, since sign-up and the front
  page feed are two of the surfaces on the list.
- Findings are identified and permanent, the way
  [the quality backlog](../quality-backlog.md)'s are: a finding that is dropped
  keeps its ID rather than being renumbered, so a later task's citation never
  goes stale.
- Where a finding lands is an
  [ADR-0020](../../adr/0020-documentation-roles.md) question and not obvious —
  this is a snapshot of a moment, not a standing document, and the repository
  has no home for that shape yet.

## Open questions

1. **Where do the findings live?** A file under `docs/tasks/iteration-7.5/`
   that dies with the iteration; an addition to
   [the quality backlog](../quality-backlog.md), which is the existing home for
   "found, not yet scheduled"; or the iteration index itself. The first is
   honest about the document's lifespan, the second reuses a mechanism that
   already works and already has a sweep behind it
   ([`/quality-sweep`](../quality-backlog.md)).
2. **Do the screenshots get committed?** They are the only part of this task
   that is evidence rather than opinion, and they are also binary files that
   are stale the moment [task 06](06-page-shell.md) lands.
3. **Which widths count?** "Phone and desktop" needs numbers, and the numbers
   become the widths every later task verifies at. Tablet is a third answer
   nobody has asked for yet.
4. **How far does "usability" reach?** A control that is hard to find is
   clearly in. An entire flow that is missing a step — say, no way to get from
   a beer's details back to the search that found it — is a product finding
   wearing a usability finding's clothes, and it is worth deciding now whether
   those get recorded here or sent to [the backlog](../backlog.md).
5. **Is a finding allowed to say "this is fine"?** A baseline that records only
   problems cannot later show that something was deliberately kept, and this
   iteration is going to change things that were right.

## Acceptance criteria

- [ ] Every surface named in Scope is captured at both agreed widths, and the
      captures are reproducible — a committed script or a documented command,
      not a manual pass someone would have to repeat by hand
- [ ] Each finding carries a permanent ID, names the surface and width it was
      found at, and states the problem without naming a fix
- [ ] At least one finding is cross-page — a problem invisible from any single
      surface — or the audit states in writing that it looked for such findings
      and there were none
- [ ] Tasks [06](06-page-shell.md)–[10](10-profile-and-sign-up-layout.md) each cite the
      findings on their surface in their Scope, so that
      [DW-5](../iteration-7.5.md) can be checked by reading rather than by
      remembering
- [ ] The capture script runs in CI or is covered by a test that fails when a
      surface it should capture no longer exists, so the baseline cannot
      silently stop covering a page
- [ ] `make verify` is green

## Notes

This task was not in the product owner's original request; it was proposed on
2026-09-12 as the thing that gives the four layout tasks a shared problem
statement, and accepted.

The accepted cost, stated here rather than discovered later: a findings
document is stale from the moment the redesign starts landing, and nothing
keeps it true. It is a baseline, not a standing document — which is exactly
what question 1 is asking about.
