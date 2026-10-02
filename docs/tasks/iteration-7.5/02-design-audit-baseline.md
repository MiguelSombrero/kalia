# Task 02: The app as it stands, audited

- **Status:** done
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

The surfaces: front page signed out and signed in, catalog list with filters
and pagination, a beer's details, an empty cellar and a populated one, a public
cellar, a profile, sign-up, Keycloak's login and registration pages (which
[DW-3](../iteration-7.5.md) names), and the shared loading, empty, error and
not-found states.

Two further kinds of finding are recorded, each marked as such. A
**product** finding is a flow missing a step rather than a control that is
hard to use. A **keep** finding is something deliberately right, so that the
redesign can show it kept it on purpose rather than by accident.

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
- **The agreed widths are the iteration's**, 375×812 and 1280×800
  ([iteration index](../iteration-7.5.md), decided in refinement).

Decided with the product owner in refinement, 2026-10-01:

- **The findings live in `docs/tasks/iteration-7.5/audit.md`**, a file that
  dies with the iteration rather than an addition to
  [the quality backlog](../quality-backlog.md) or the iteration index. It is a
  snapshot, and its place says so. `scripts/check-tasks.mjs` reads only
  `NN-*.md` files, so it accepts a file of this name beside the tasks.
- **Findings are written in words; no screenshot is committed, pushed or
  uploaded** (`CLAUDE.md`). Looking at a page to write a finding happens in
  the desktop app's browser pane, and any capture taken to look closely stays
  in the scratchpad.
- **The committed evidence is a Playwright "surface tour" spec** in
  `frontend/e2e/`: code only, running in Playwright's own isolated headless
  browser against the local stack. It visits every surface in Scope at both
  widths and asserts that each one rendered, so a page that disappears or
  breaks fails the suite. **It takes no screenshots at all**, not even into
  gitignored output, so there is no image to leak. Later tasks may extend it.
- **A product finding is recorded here, not sent elsewhere first.** The task
  that owns the surface records what happens to it — fixed, or a
  [backlog](../backlog.md) entry — and that written decision is what
  [DW-5](../iteration-7.5.md) checks.
- **A keep finding is allowed** and carries an ID like any other.

## Open questions

**None.**

## Acceptance criteria

- [x] `docs/tasks/iteration-7.5/audit.md` records findings for every surface
      named in Scope at both agreed widths, each with a permanent ID, the
      surface and width it was found at, its kind (problem, product or keep),
      and the problem stated without naming a fix
- [x] A committed Playwright spec visits every surface in Scope at both agreed
      widths and asserts each rendered; it was confirmed to fail when pointed
      at a route that does not exist, and it writes no screenshot anywhere
- [x] `node scripts/check-no-raster-images.mjs` passes, and the pull request
      describes in words what was seen
- [x] At least one finding is cross-page — a problem invisible from any single
      surface — or the audit states in writing that it looked for such findings
      and there were none
- [x] Tasks [06](06-page-shell.md)–[11](11-keycloak-pages-carry-the-identity.md)
      each cite the findings on their surface in their Scope, so that
      [DW-5](../iteration-7.5.md) can be checked by reading rather than by
      remembering
- [x] `make verify` is green

## Notes

This task was not in the product owner's original request; it was proposed on
2026-09-12 as the thing that gives the four layout tasks a shared problem
statement, and accepted.

The accepted cost, stated here rather than discovered later: a findings
document is stale from the moment the redesign starts landing, and nothing
keeps it true. It is a baseline, not a standing document — which is why it
lives beside the tasks and dies with the iteration.
