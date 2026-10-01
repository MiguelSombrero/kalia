# Task 13: Accessibility and contrast, re-verified across the redesign

- **Status:** refined
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-7

## Why

Kalia holds itself to WCAG 2.1 AA and enforces it at three layers —
`eslint-plugin-jsx-a11y`, `jest-axe` in unit tests, `@axe-core/playwright` in
E2E ([architecture.md §5](../../architecture.md)). Every task in this iteration
runs under those layers, and each one carries its own accessibility criteria.
So this task is not there to catch what they missed by being lax. It is there
to catch the two things they are structurally unable to see.

The first is **contrast**.
[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) records it as an
accepted Bad consequence: "contrast ratios are verified by computation and by
E2E scans, not at unit-test time: jsdom cannot evaluate rendered colour." Its
Evidence table — five pairings with computed ratios — is the record of a
palette this iteration replaces, and an ADR whose evidence describes colours
that no longer ship is worse than one with no evidence.

The second is **everything that is only visible across pages**. An axe scan
passes one page at a time. Heading structure that is inconsistent between
surfaces, a focus order that makes sense per page and not through a flow, a
touch target that is fine in the catalog and cramped in the cellar, a control
that means one thing on the profile and another in the feed — none of these
fails a per-page scan, and all of them are introduced by six surfaces being
redesigned by five different tasks.

There is a third thing this iteration introduces that Kalia has never had:
motion. Hover, transition and arrival animation are folded into the tasks that
own each surface, which means `prefers-reduced-motion` is asserted five times
by five tasks and checked as a whole by nobody.

## Scope

One closing pass over the redesigned app: contrast recomputed and recorded
against the palette that actually ships, and the cross-surface accessibility
properties no single-page check can see — heading structure, focus order
through real flows, target sizes, keyboard operability of everything the
redesign made interactive, and reduced-motion behaviour.

Findings are fixed here rather than handed back, unless a fix is large enough
to be its own task.

## Non-goals

- Re-running the per-surface checks the layout tasks already ran. Those are
  their gates and they passed; this task assumes them.
- Raising the standard above WCAG 2.1 AA beyond the one raise the product
  owner made in refinement — the 24×24 minimum target size
  ([iteration index](../iteration-7.5.md)). Any further raise is a different
  iteration.
- Auditing the Keycloak pages' controls. They are stock `keycloak.v2` and
  deliberately left so ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md));
  re-theming them, and the axe scans and contrast that go with it, are
  [task 11](11-keycloak-pages-carry-the-identity.md)'s own criteria.
- Building new enforcement beyond the target-size test below. The contrast
  check is [task 03](03-visual-identity.md)'s. If this pass finds that another
  class of problem needs a check, that is a finding to record, and
  [ADR-0039](../../adr/0039-mechanisms-for-recurring-rule-violations.md) is the
  standing answer for what to do about it.

## Constraints

- [ADR-0019](../../adr/0019-adr-format-and-conventions.md): an accepted ADR is
  amended, not rewritten. Whatever
  [task 03](03-visual-identity.md) did to
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) is what this task
  completes; it does not produce a second, competing record of the palette.
- Contrast must be computed, not sampled from a screenshot — the
  relative-luminance formula, the way iteration 2 did it, because a screenshot
  is subject to whatever the renderer did.
- The E2E scans need the stack up (`docker compose`), and host ports are shared
  between worktrees, so this runs in one worktree at a time (`CLAUDE.md`,
  environment notes).
- Anything found here that is *also* a pre-existing problem rather than one the
  redesign introduced belongs in
  [the quality backlog](../quality-backlog.md) unless it is cheap to fix, per
  this project's usual split.

- The agreed widths, the 24×24 minimum target size, the contrast check and
  the route back to the product owner on a contrast failure are
  iteration-wide decisions recorded in
  [the iteration index](../iteration-7.5.md).

Decided with the product owner in refinement, 2026-10-01:

- **Three flows are walked by keyboard alone, in both locales:**
  1. search → open a beer → add it to the cellar → see it in the cellar →
     remove it;
  2. sign in → profile → make the cellar public → open one's own public
     cellar;
  3. front page → take in new entries through the "N new" control → follow a
     username → that person's public cellar.

  Flow 1 is also covered end to end by a Playwright test.
- **The contrast check already exists when this task starts**, built by
  [task 03](03-visual-identity.md). This task verifies the final palette under
  it and completes [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s
  Evidence, rather than building a second record.
- **The 24×24 minimum target size is enforced here.** Tasks 06–10 design to
  it; this task asserts it across every surface and records the raise above
  WCAG 2.1 AA in an ADR, since staying at 2.1 AA was the rejected
  alternative.
- **A contrast failure in a chosen palette stops the task.** The failing
  pairing goes to the product owner with built adjustments, as a
  `design-task` round, and the owning task's ADR is amended with the choice.
  It is never patched quietly.
- **Both locales are checked**, because Finnish overflows where English fits.

## Open questions

**None.**

## Acceptance criteria

- [ ] Every colour pairing the redesigned app actually uses is recomputed
      against WCAG 2.1 AA, and
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence
      table describes the palette that ships
- [ ] `@axe-core/playwright` scans pass on every surface, at both agreed widths
      and in both locales
- [ ] The three agreed flows were walked by keyboard alone in both locales and
      the focus order through each is correct, with a Playwright test covering
      flow 1 end to end by keyboard
- [ ] Every interactive element on every surface is at least 24×24 CSS pixels
      at both agreed widths, or meets success criterion 2.5.8's spacing
      exception, asserted by a Playwright test
- [ ] An ADR records the raise to WCAG 2.2's 2.5.8 and the rejected
      alternative of staying at 2.1 AA, passing `node scripts/check-adrs.mjs`,
      and [architecture.md §5](../../architecture.md)'s accessibility bullet
      states the bar that is actually enforced
- [ ] Everything the redesign made interactive is operable without a mouse,
      and everything it animates respects `prefers-reduced-motion`, covered by
      a test
- [ ] Heading structure is coherent across surfaces — one `h1` per page and no
      skipped levels — asserted by a test rather than by inspection
- [ ] Every finding is fixed, scheduled as its own task, or recorded in
      [the quality backlog](../quality-backlog.md) with an ID; none is left
      only in a PR description
- [ ] `make verify` is green

## Notes

Proposed on 2026-09-12 while sketching this iteration and accepted. It is
deliberately the last task: it can only be honest once every surface has landed,
and it is the task that makes [DW-7](../iteration-7.5.md) checkable.
