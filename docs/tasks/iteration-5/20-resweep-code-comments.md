# Task 20: Re-sweep the tree's comments to the policy

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

[ADR-0017](../../adr/0017-code-comment-policy.md) named the mechanism that
undoes it, in its own Consequences: "The density of the current tree is what
future agents imitate, so this sweep is also what makes the rule stick." Its
Context is blunter — the problem "is self-reinforcing. Agents match the
comment density of surrounding code, so each new file inherits the essay
register from its neighbours. Current density is itself an instruction to
future agents."

That instruction currently contradicts the rule.
[Task 18](18-check-code-comments.md) records the measurements; the short
version is that the 2026-07-26 sweep has been undone, seven hand-written files
now carry more comment lines than code lines where ADR-0017 measured none, and
92 comments name an ADR they must move in lockstep with.

Tasks 17, 18 and 19 change where the rule loads, what fails the build, and how
the work is sequenced. None of them changes what the next agent reads when it
opens a neighbouring file. Without this task they spend every future session
arguing with the surrounding register, and ADR-0017's own analysis says the
register wins.

## Scope

Bring the hand-written tree back to the policy, and leave the advisory ratio
from [task 18](18-check-code-comments.md)'s checker at or below ADR-0017's
0.09 baseline as measured by that checker's pinned method.

The classes to cut are already identified, from an audit on 2026-08-15:

- the nine layer `package-info.java` files — `web`, `application` and
  `domain` across `catalog`, `cellar` and `identity` — each paraphrasing
  [ADR-0007](../../adr/0007-backend-package-structure.md)'s layer contract,
  with `catalog/web` and `cellar/web` byte-identical apart from the module
  name and the rest near-paraphrases of each other, plus the three
  module-root ones that name the same ADR (twelve in total);
- byte-identical Javadoc on `CatalogApi.java` and `IdentityApi.java`;
- two `*ExceptionHandler` paraphrases of
  [ADR-0014](../../adr/0014-shared-exception-handling.md);
- `SecurityConfig.java`'s paraphrase of
  [ADR-0028](../../adr/0028-resource-server-and-current-user.md);
- a 16-line block in `lib/auth/valkeyAdapter.ts` restating
  [ADR-0030](../../adr/0030-per-session-token-storage.md);
- comments that restate the signature or the function name below them, in
  `BeerSearchCriteria.java`, `CurrentUserService.java`, `i18n/resolveLocale.ts`,
  `e2e/sign-in-out.spec.ts`, `lib/auth/valkeyAdapter.ts`,
  `features/auth/endSessionUrl.ts` and `fi/kalia/package-info.java`.

## Non-goals

- Generated code. `frontend/lib/api/generated` is out of ADR-0017's scope by
  its own Decision.
- Any change to code. This task edits comments; if a comment turns out to be
  the only thing making a piece of code comprehensible, that is a finding for
  the backlog, not a licence to refactor here.
- Revisiting the policy. If the sweep finds a class of comment the policy
  handles badly, that is ADR-0017's revisit trigger and earns an amendment —
  not a silent exception applied while sweeping.

## Constraints

- **Comments that must survive, named explicitly so the sweep cannot take
  them:** every reference example ADR-0017 lists —
  `features/catalog/Pagination.tsx`, `lib/api/mutator.ts`,
  `CatalogController.java`'s "No `@Validated`",
  `GlobalExceptionHandler.java`'s `@Order`, and `i18n/server.ts` — plus
  `SecurityConfig.java`'s CSRF explanation, `CellarService.java`'s Spring Data
  merge-cascade note, `instrumentation.ts`'s measurement against a pinned
  Next.js version, and `lib/auth/signInContext.ts` (product-owner decision,
  2026-08-15).
- Comments explaining why a test asserts something apparently pointless stay.
  ADR-0017 protects them by name — they are what stops a cleanup pass deleting
  a guard, and this task is exactly the cleanup pass it meant.
- Where an invariant is guarded by a test, an ArchUnit rule or the build, the
  comment reduces to at most one line and preferably points at the guard —
  ADR-0017's corollary. `SecurityConfig.java`'s ADR-0028 paraphrase is the
  clearest case: `ArchitectureTest`'s `onlyIdentityConfiguresWebSecurity` is
  already the guard.
- Where breaking the invariant fails silently or only in production builds,
  the comment is mandatory and stays, opening with "do not". The sweep must
  not reduce that class on ratio grounds.
- A cut comment's content is not preserved anywhere: it already exists in the
  ADR, which is the point. Nothing is moved to a commit message or a doc as
  compensation.
- The sweep lands after [task 18](18-check-code-comments.md), so the checker
  verifies the result rather than the result being asserted (product-owner
  decision, 2026-08-15).
- The 0.09 target is measured by the checker's pinned method, not by
  ADR-0017's original figure, which is not reproducible.

## Open questions

**None.**

## Acceptance criteria

- [x] `node scripts/check-comments.mjs` reports a repository-wide hand-written
      ratio at or below 0.09 by its own pinned method, with no hard failures
- [x] Every comment named in Constraints as surviving is verified still
      present, by an explicit grep for each rather than by inspection
- [x] No file in the hand-written tree carries more comment lines than code
      lines, except any the sweep deliberately keeps — each such exception
      named in the pull request description with the ADR-0017 clause that
      protects it
- [x] `mvn clean verify` and `npm test` are green, and the full Playwright
      suite passes — the evidence that a comment-only sweep changed no
      behavior, since a sweep that accidentally edits code would show here
- [x] `ArchitectureTest` and `ModularityTest` pass unchanged, confirming the
      `package-info.java` edits kept the annotations those files exist to hold
- [x] `node scripts/check-adrs.mjs` and `node scripts/check-tasks.mjs` are
      green, and the doc-sync gate is recorded in the pull request

## Notes

The direct descendant of ADR-0017's own 2026-07-26 sweep, which took the ratio
from 0.13 to 0.09 and is the reason this task can name a target rather than
guess one. Sibling of [task 17](17-localize-the-code-comment-rule.md),
[task 18](18-check-code-comments.md) and
[task 19](19-separate-implementing-from-commenting.md), and last of the four
by design.

ADR-0017's revisit trigger applies with more force after this sweep than
before it: if an agent later breaks something one of these deleted comments
covered, that is evidence against the rule for that class, and the case gets
recorded in the ADR rather than the comment quietly restored.
