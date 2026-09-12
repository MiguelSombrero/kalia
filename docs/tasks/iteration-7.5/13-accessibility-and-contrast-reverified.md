# Task 13: Accessibility and contrast, re-verified across the redesign

- **Status:** needs-refinement
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
- Raising the standard above WCAG 2.1 AA. That is a product owner decision and
  a different iteration.
- Auditing the Keycloak pages' controls. They are stock `keycloak.v2` and
  deliberately left so ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md));
  the contrast of what [task 11](11-keycloak-pages-carry-the-identity.md)
  changed there is that task's own criterion, since those pages are outside
  `@axe-core/playwright`'s reach entirely.
- Building new enforcement. If this pass finds that a class of problem needs a
  check, that is a finding to record, and
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

## Open questions

1. **Which flows get a focus-order walk?** Per-page scans are automated; a walk
   through "search → open a beer → add to cellar → see it in the cellar → remove
   it" is manual and is where focus actually breaks. The list of flows is the
   scope of the manual half.
2. **Does anything here become permanent enforcement?** A contrast computation
   that runs in CI against `globals.css` would close the gap
   [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) named, and would
   sit naturally beside [task 05](05-token-only-styling-enforced.md)'s checker.
   Whether that is in scope or a finding is worth deciding up front.
3. **Is target size in play?** WCAG 2.1 AA does not require the 24×24 minimum
   that 2.2 added, so a redesign could be AA-conformant and still uncomfortable
   on a phone. Whether Kalia holds itself to the stricter line is a product
   owner call and would be a deliberate raise of the bar.
4. **What happens to a finding that needs a redesign to fix?** A contrast
   failure in a chosen palette is not a bug to patch quietly — it changes a
   decision the product owner made, and the route back to them should be agreed
   before it happens rather than during.
5. **Are both locales checked?** Finnish text is longer, and text that fits in
   English and overflows in Finnish is an accessibility problem that only one
   of the two locales shows.

## Acceptance criteria

- [ ] Every colour pairing the redesigned app actually uses is recomputed
      against WCAG 2.1 AA, and
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence
      table describes the palette that ships
- [ ] `@axe-core/playwright` scans pass on every surface, at both agreed widths
      and in both locales
- [ ] The agreed flows were walked by keyboard alone and the focus order
      through each is correct, with a Playwright test covering at least the
      add-to-cellar flow end to end by keyboard
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
