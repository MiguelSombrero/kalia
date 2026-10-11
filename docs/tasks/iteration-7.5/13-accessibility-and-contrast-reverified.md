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

And the bar itself is out of date. WCAG 2.2 has been the W3C recommendation
since October 2023 and adds six level A and AA success criteria that 2.1 does
not have. This iteration already adopted one of them, 2.5.8's minimum target
size, because a redesign aimed at phones could pass 2.1 AA and still be
uncomfortable to tap. Another, 2.4.11 Focus Not Obscured, is probably failed
today by the sticky header
[task 06](06-page-shell.md) introduced: tabbing backwards up a long list
scrolls the focused control underneath it. None of the three layers would
notice, because axe has no rule for that criterion.

## Scope

One closing pass over the redesigned app: contrast recomputed and recorded
against the palette that actually ships, and the cross-surface accessibility
properties no single-page check can see — heading structure, focus order
through real flows, target sizes, keyboard operability of everything the
redesign made interactive, and reduced-motion behaviour.

The same pass raises Kalia's bar from WCAG 2.1 AA to WCAG 2.2 AA. The new
criterion axe can check runs in the E2E scans, the new criteria it cannot check
are verified, and every live document that names the bar names the new one.

Findings are fixed here rather than handed back, unless a fix is large enough
to be its own task.

## Non-goals

- Re-running the per-surface checks the layout tasks already ran. Those are
  their gates and they passed; this task assumes them.
- WCAG 2.2's AAA criteria — 2.4.12 Focus Not Obscured (Enhanced), 2.4.13
  Focus Appearance, 3.3.9 Accessible Authentication (Enhanced) — and any
  other raise beyond 2.2 AA. Those belong to a different iteration.
- Restyling the Keycloak pages' controls. They are stock `keycloak.v2` and
  deliberately left so ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md));
  re-theming them, and the contrast that goes with it, are
  [task 11](11-keycloak-pages-carry-the-identity.md)'s own criteria. This task
  holds them to 2.2 AA only through the scan and the 3.3.8 walk below.
- Rewriting finished task files that name WCAG 2.1 AA. A task file records
  what was asked for and is frozen at completion
  ([ADR-0026](../../adr/0026-task-file-format.md)).
- Building new enforcement beyond the target-size and focus-not-obscured tests
  below. The contrast
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
  it; this task asserts it across every surface and records the raise in an
  ADR, since staying at 2.1 AA was the rejected alternative. The re-refinement
  below widens that raise to all of WCAG 2.2 AA.
- **A contrast failure in a chosen palette stops the task.** The failing
  pairing goes to the product owner with built adjustments, as a
  `design-task` round, and the owning task's ADR is amended with the choice.
  It is never patched quietly.
- **Both locales are checked**, because Finnish overflows where English fits.

Re-refined with the product owner on 2026-10-11, after an analysis found that
2.2 AA is a small step from where Kalia already stands:

- **Kalia's bar becomes WCAG 2.2 AA**, widening the 2026-10-01 raise of 2.5.8
  alone. The ADR this task writes records 2.2 AA as the bar. Its rejected
  alternatives are staying at 2.1 AA, and 2.1 AA plus 2.5.8 alone.
  [DW-7](../iteration-7.5.md) is amended to match.
- **The E2E suite keeps one tag scope.** `e2e/support/a11y.ts` adds `wcag22a`
  and `wcag22aa`, and the Keycloak pages are scanned under that scope like
  every other page. axe-core ships its one 2.2 rule, `target-size`, disabled
  by default. A scan without the `wcag22aa` tag runs no 2.2 check at all and
  still passes. jsdom does no layout, so `jest-axe` gains nothing here, and the
  check belongs to the E2E layer only.
- **A 2.2 failure on a stock Keycloak control** is fixed in the theme through
  documented hooks where possible, the same limit
  [task 11](11-keycloak-pages-carry-the-identity.md)'s constraints set. Where
  it is not possible, the scan excludes that one named selector, the ADR
  records why, and the [quality backlog](../quality-backlog.md) gets an ID.
- **2.4.11 Focus Not Obscured is asserted by a Playwright test.** Along the
  three keyboard flows at the phone width, no focused element may be entirely
  hidden by the sticky header, the feed's sticky "N new" control or a toast.
- **2.5.7, 3.2.6, 3.3.7 and 3.3.8 are verified by walking the app**, and the
  result of each is recorded as the ADR's evidence. That includes a criterion
  that does not apply yet, saying why — Kalia has no help mechanism for 3.2.6
  to hold in place. 3.3.8 is walked on Keycloak's login and registration
  pages, because that is where authentication happens.
- **A 2.2 fix that changes what a chosen layout looks like goes back to the
  product owner** as a `design-task` round, by the same route as a contrast
  failure. A fix the eye cannot see, such as scroll padding or a hit area grown
  without changing the drawn control, is made directly.

## Open questions

**None.**

## Acceptance criteria

- [ ] Every colour pairing the redesigned app actually uses is recomputed
      against WCAG 2.2 AA, whose contrast criteria are 2.1's unchanged, and
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s Evidence
      table describes the palette that ships
- [ ] `@axe-core/playwright` scans pass on every surface, the Keycloak pages
      included, at both agreed widths and in both locales, with
      `e2e/support/a11y.ts` scanning at WCAG 2.2 AA (`wcag22a`, `wcag22aa`
      added); any scoped exclusion names one selector and is recorded in the
      ADR and the quality backlog
- [ ] The three agreed flows were walked by keyboard alone in both locales and
      the focus order through each is correct, with a Playwright test covering
      flow 1 end to end by keyboard
- [ ] Every interactive element on every surface is at least 24×24 CSS pixels
      at both agreed widths, or meets success criterion 2.5.8's spacing
      exception, asserted by a Playwright test
- [ ] No focused element on the three agreed flows is entirely hidden by the
      sticky header, the feed's "N new" control or a toast at the phone width
      (2.4.11), asserted by a Playwright test
- [ ] 2.5.7, 3.2.6, 3.3.7 and 3.3.8 were walked in both locales, 3.3.8 on the
      Keycloak login and registration pages, and the result of each is
      recorded as the ADR's evidence
- [ ] An ADR records WCAG 2.2 AA as Kalia's bar, with staying at 2.1 AA and
      2.1 AA plus 2.5.8 alone as the rejected alternatives, passing
      `node scripts/check-adrs.mjs`, and
      [architecture.md §5](../../architecture.md)'s accessibility bullet
      states the bar that is actually enforced
- [ ] Every live document, code comment and CI step name that names the bar
      names WCAG 2.2 AA; accepted ADRs that name it are amended rather than
      rewritten ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)),
      and finished task files are left as they were
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

Re-refined on 2026-10-11 to adopt WCAG 2.2 AA in full rather than its one
target-size criterion, at the product owner's request.
