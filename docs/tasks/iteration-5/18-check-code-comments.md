# Task 18: Check the code-comment policy mechanically

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

Every load-bearing rule in this repository has a mechanism behind it. ArchUnit
and Spring Modulith guard the module boundaries, `check-adrs.mjs` the ADR
index and structure, `check-tasks.mjs` the task files and `Done when`
coverage, `permissions.deny` the generated API client
([ADR-0012](../../adr/0012-orval-api-client.md)), and the `api-client-drift`
CI job the OpenAPI contract. [ADR-0017](../../adr/0017-code-comment-policy.md)
has nothing, and says so itself: "Nothing checks a comment against the ADR it
paraphrases."

That is not a small gap in a repository whose own stated rule is that the
enforcement mechanism sets a rule's weight (ADR-0017's corollary), and whose
evidence is that unenforced conventions drift here specifically: the ADR index
drifted silently until `check-adrs.mjs` existed
([ADR-0019](../../adr/0019-adr-format-and-conventions.md)) and the task format
drifted three separate ways before `check-tasks.mjs` did
([ADR-0026](../../adr/0026-task-file-format.md)).
[ADR-0038](../../adr/0038-in-repo-spec-driven-process.md) states the position
outright: "Deterministic checks stay the enforcement mechanism."

The drift has happened, measured 2026-08-15:

- The hand-written comment ratio is back at or above where it was **before**
  ADR-0017's sweep. The sweep took it from 0.13 to 0.09; it now measures
  between 0.13 and 0.18 depending on whether blank lines count as code.
- **Seven hand-written files carry more comment lines than code lines**, where
  ADR-0017 measured none: `lib/auth/signInContext.ts`,
  `features/auth/actions.ts`, `lib/auth/endLocalSession.ts`,
  `lib/auth/sessionCookie.ts`, `lib/auth/valkeyClient.ts`,
  `lib/auth/sessionId.ts` and `identity/domain/CurrentUser.java`.
- **92 comments name an ADR** — 43 in Java, 49 in TypeScript. Each is a place
  where a comment and an ADR must move in lockstep, guarded by nothing.
- Process narration, which `CLAUDE.md` bans outright, is live in the tree:
  `CellarService.java` carries a roadmap iteration number, and
  `e2e/sign-in-out.spec.ts` narrates what a defect used to do.

That the two ratio figures disagree is its own finding. ADR-0017 never wrote
down how it counted, so its 0.09 cannot be reproduced — two careful passes
over the same tree returned 0.13 and 0.18. A checker fixes the method as a
side effect of existing, which is worth having independently of what it fails
on.

## Scope

A third checker beside the two that already run in CI, failing the build on
the part of ADR-0017 that is decidable from a comment's text and reporting the
part that is not.

- `scripts/check-comments.mjs`, sibling to `check-adrs.mjs` and
  `check-tasks.mjs` in shape, style and dependency-freedom.
- A hard-failing tier for process narration.
- An advisory tier that reports candidate ADR paraphrase and the comment
  ratio, and always exits zero.
- A CI job, and the command added to `CLAUDE.md`'s Commands block.
- The handful of live narration violations fixed, so the hard tier lands
  green.

## Non-goals

- Judging whether a comment carries a fact the repository lacks. That is the
  substance of ADR-0017 and no script can decide it; the checker takes the two
  mechanically decidable classes and leaves the rest to review and to
  `/quality-sweep`. ADR-0017's own census puts those two classes at roughly
  44% of what it found (35% ADR restatement, 9% process narration), so this
  is a meaningful share rather than the whole rule.
- The tree-wide comment cleanup — [task 20](20-resweep-code-comments.md). This
  task fixes only what it must to land green.
- Generated code. `frontend/lib/api/generated` is out of ADR-0017's scope by
  its own Decision, and its comments come from the backend's own OpenAPI
  annotations.
- Checking pull request bodies, commit messages, or documentation prose.

## Constraints

- The checker stays dependency-free plain Node ESM so it runs in CI with no
  `npm install`, matching the constraint both existing checkers' headers state
  and the reason they are written as they are.
- Failure output follows the existing style: one line per failure naming the
  file and what is wrong, exit 1 on any failure.
- The header comment traces each rule to an observed failure, the way
  `check-tasks.mjs`'s does. This is the one place a long explanatory comment
  is correct — it is a checker's rationale, not a paraphrase of an ADR.
- **Split severity.** Hard-fail on process narration only; report the rest
  (product-owner decision, 2026-08-15).
- The hard tier covers only unambiguous patterns: `task N`, `iteration N`,
  `PR #N`, `pull request`, `used to be`, `formerly`, `renamed from`. It
  deliberately excludes `previously` and `no longer`, which have legitimate
  uses describing external state rather than change history —
  `lib/auth/valkeyAdapter.ts`'s "no longer exists" is about a Keycloak
  session. Those two go in the advisory tier (product-owner decision,
  2026-08-15).
- The advisory tier reports: comment blocks naming an ADR that run more than
  one line, since ADR-0017 allows a one-line pointer and nothing more; the
  per-file ratio and any file whose comments outnumber its code; and the
  repository-wide hand-written ratio against the 0.09 baseline. It always
  exits zero, and prints as a summary the way the JaCoCo coverage step in
  `ci.yml` already does (product-owner decision, 2026-08-15).
- **No ratio threshold may hard-fail.** A naive one would flag
  `frontend/lib/auth/signInContext.ts`, whose 21 comment lines against 12 code
  lines are exactly what ADR-0017 protects — external Auth.js behavior plus a
  "do not" warning for a failure that is otherwise silent. Failing the build
  on it would push agents toward deleting load-bearing warnings to get green,
  which is worse than the problem being solved (product-owner decision,
  2026-08-15).
- The counting method is pinned in the script's header and the baseline
  re-derived by it, so the ratio becomes reproducible rather than a number
  nobody can recompute.
- The CI job runs unconditionally, outside `ci.yml`'s `changes` path filter,
  for the same reason `adr-index-check` and `task-index-check` do.
- Each failure mode is **verified to fail** rather than assumed to, following
  the discipline [ADR-0026](../../adr/0026-task-file-format.md)'s Evidence
  records for its own thirteen rules.

## Open questions

**None.**

## Acceptance criteria

- [ ] `scripts/check-comments.mjs` exists, is dependency-free plain Node, and
      each hard-failing pattern is verified to fail by introducing it alone
      and observing a distinct message naming the file and line — one case per
      pattern in the hard tier
- [ ] The advisory tier is verified **not** to fail the build: a file whose
      comments outnumber its code, and a multi-line ADR-naming block, are both
      reported and both exit zero — with
      `frontend/lib/auth/signInContext.ts` as the live case that must be
      reported and must not fail
- [ ] The checker is green against the real tree, with the live narration
      violations in `CellarService.java`, `e2e/sign-in-out.spec.ts` and
      `lib/auth/valkeyAdapter.ts` fixed in this task
- [ ] The script's header pins the counting method, and running it prints a
      repository-wide ratio that can be recomputed by hand from the stated
      method
- [ ] A `comment-policy-check` job runs `node scripts/check-comments.mjs` in
      [.github/workflows/ci.yml](../../../.github/workflows/ci.yml),
      unconditionally rather than behind the `changes` filter, and is
      confirmed green on the branch's own CI run
- [ ] `CLAUDE.md`'s Commands block lists the new checker beside the other two;
      [ADR-0017](../../adr/0017-code-comment-policy.md) is amended to record
      that its policy now has a guard, and
      `node scripts/check-adrs.mjs` passes
- [ ] `mvn clean verify` and `npm test` stay green, confirming the narration
      fixes changed comments only

## Notes

The enforcement half of the change [task 17](17-localize-the-code-comment-rule.md)
begins; that task is the proximity half. Order matters only in that the ADR
task 17 writes is where this checker's decision is recorded, so this task
amends rather than introduces it.

ADR-0017's revisit trigger is relevant here and should not be lost: if an
agent breaks something a deleted comment had covered, that is evidence against
the rule for that class of comment. A checker makes deletion cheaper, so the
trigger matters more after this task, not less.
