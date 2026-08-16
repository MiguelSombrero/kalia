# ADR-0017: Code comments carry only what the repo cannot

- **Status:** accepted
- **Date:** 2026-07-26
- **Amended:** 2026-08-15 — the policy gained a mechanism,
  `scripts/check-comments.mjs` (iteration 5 task 18)

## Context

Product-owner review (2026-07-26) raised a question this project is
unusually well placed to answer: the human default is that code explains
itself and comments stay minimal, but every line here is written by an AI
agent. If verbose comments give agents context that makes them perform
better, they earn their place regardless of the human norm. So — do they?

**What was measured.** Every comment block in the hand-written code was
read and classified (109 files, 65 blocks):

| | code lines | comment lines | ratio |
| --- | --- | --- | --- |
| Hand-written (backend + frontend) | 3,019 | 400 | **0.13** |
| Orval-generated (`lib/api/generated`) | 296 | 136 | 0.46 |

No hand-written file has more comment lines than code lines. The files
that do are all orval output (`searchBeersParams.ts` at 4.2:1 is
generated JSDoc from the backend's own OpenAPI descriptions) and the six
`package-info.java` files, which carry 4–7 lines of Javadoc above a
two-line package declaration because that file exists to hold
`@NullMarked` and Java offers nowhere else for package docs.

So the volume is not the problem. The **composition** is:

- **~170 lines (42%)** — warnings that a locally-correct edit is globally
  wrong, or facts about external framework behaviour.
- **~140 lines (35%)** — restatements of an ADR or `docs/architecture.md`.
- **~40 lines (9%)** — process narration: iteration/task numbers, what a
  bug used to do.
- remainder — short one-liners, mostly sound.

**Where verbosity demonstrably helps.** Agents fail by local
plausibility: a change correct in the file they can see and wrong in the
system. An agent editing one file usually has only that file in context —
not the ADR, not the roadmap — so an in-file comment is the only channel
guaranteed to be present at the moment of the edit. Humans have a "this
looks load-bearing, check `git blame`" reflex; agents rarely do unprompted.
The comments in this codebase that carry real weight all defuse an edit an
agent would otherwise make confidently:

- `Pagination.tsx` — "plain anchors, not `next/link` — do not upgrade
  them." Tidying that component reintroduces a bug visible **only in
  production builds**, which no test, dev-server check or review catches.
- `mutator.ts` — the timer race instead of an `AbortSignal`; simplifying
  it silently doubles every detail-page backend request.
- `CatalogController.java` — "No `@Validated` here"; an agent adds it as
  an obvious omission.
- `GlobalExceptionHandler.java` — `@Order` reads as decorative;
  [ADR-0014](0014-shared-exception-handling.md) records that removing it
  breaks the feature silently.
- `i18n/server.ts` — per-call i18next instance, not a module singleton;
  "optimizing" it is a concurrency bug.

What these share is not length. Each states a fact about the **outside
world** — App Router internals, Spring Boot's `LOWEST_PRECEDENCE`
default, springdoc's `required` inference, React's RSC suspension — that
no amount of reading this repository reveals.

**Where verbosity hurts.** Three costs, the first specific to this
project's first stated goal:

1. **ADR-restating comments are the only unguarded drift surface here.**
   The doc-sync gate (CLAUDE.md) covers `docs/architecture.md`, the
   iteration files and ADRs. Nothing checks a comment against the ADR it
   paraphrases. `next.config.ts` carried near-verbatim
   [ADR-0016](0016-security-response-headers.md) prose across 24 of its 25
   comment lines: two places that must move in lockstep, enforced by
   nothing. A stale comment is worse than an absent one — an agent trusts
   what is in front of it and never opens the ADR. This already happened:
   `LocaleSwitcher.tsx` said full styling was "task 8's job" while
   iteration 2 task 8 was already `[x]`, telling every agent that shipped
   work was still pending.
2. **Uniform annotation destroys the signal.** The `Pagination.tsx`
   warning needs to stand out. It sat in a codebase where five HTTP
   response headers each carried a paragraph of settled rationale. When
   everything is annotated, agents skim — and the one comment that had to
   be read is the one skimmed.
3. **It is self-reinforcing.** Agents match the comment density of
   surrounding code, so each new file inherits the essay register from its
   neighbours. Current density is itself an instruction to future agents.

Underneath all three is an audience mismatch. An ADR is written for
someone *deciding*: it needs the alternatives weighed, the measurements,
the revisit trigger. A comment is for someone *editing this line*: it
needs the one sentence that prevents a wrong edit. The verbose comments
here were written for the ADR's audience, which is precisely why they read
as duplication — they are duplication.

## Decision

**A comment earns its place only if it carries information not present
anywhere in the repository and not derivable by reading it** — external
framework or library behaviour, an empirical measurement, or a warning
that a locally-correct edit is globally wrong. Everything else is a
pointer: one line naming the ADR or doc section.

**Corollary — let the enforcement mechanism decide the weight:**

- Breaking the invariant **fails a test, ArchUnit rule or the build** →
  that is the guard. Comment at most one line, and prefer pointing at the
  test.
- Breaking it fails **silently, or only in production builds** → the
  comment is mandatory, and its first sentence says "do not".

**Applied rules:**

- **No process narration in code.** No iteration or task numbers, no PR or
  review references, no "used to be" or "this was changed because". This
  already followed from CLAUDE.md's existing rule; the sweep in this PR
  enforces it. That history belongs in the commit message and PR
  description, which are built to hold it.
- **A decision's rationale lives in its ADR, once.** In code, name the ADR
  and state only the part a future editor of that line would get wrong
  without it. `// ADR-0016. No nonce: keeps static rendering.` — not the
  trade-off analysis.
- **Comments explaining why a test asserts something apparently pointless
  stay.** They are what stops a cleanup pass from deleting a guard.
  `Pagination.test.tsx` and `GlobalExceptionHandlerIT`'s `Allow`-header
  test are the reference examples.
- **`package-info.java` keeps one sentence** naming the layer and its ADR.
  Its content is already stated in
  [ADR-0007](0007-backend-package-structure.md) *and* mechanically
  enforced by `ArchitectureTest` — the test is the only copy that cannot
  drift.
- **Generated code is out of scope.** `lib/api/generated` is orval output;
  its comments come from the backend's OpenAPI annotations and are
  regenerated, never hand-edited.

> **Amended 2026-08-15.** The gap Context named — "nothing checks a comment
> against the ADR it paraphrases" — is now partly closed. Drift measured
> that day had returned the hand-written ratio to at or above this ADR's
> pre-sweep 0.13, with seven files carrying more comment lines than code
> and process narration live in the tree again. `scripts/check-comments.mjs`
> hard-fails the decidable slice — process narration (`task N`,
> `iteration N`, `PR #N`, `pull request`, `used to be`, `formerly`,
> `renamed from`) — and reports, advisory only and never failing the build,
> any comment block that names an ADR and runs more than one line, plus the
> per-file and repository-wide comment ratio against the 0.09 baseline
> above. Judging whether a comment actually paraphrases the ADR it names,
> or whether a ratio outlier like `signInContext.ts` is load-bearing rather
> than excess, stays a review call no script can make — the checker's own
> header states that limit, and `/quality-sweep` covers it at a coarser
> grain (iteration 5 task 18).

## Consequences

- Hand-written comment lines drop from 400 to 262 (ratio 0.13 → 0.09),
  with every trap warning and external-behaviour note retained — the cut
  falls almost entirely on ADR paraphrase and process narration. The
  expectation is that agent performance *improves*, because the surviving
  warnings no longer compete with background prose.
- Reviewing a comment now has a concrete test rather than taste: name the
  fact it carries that is not elsewhere in the repo, or delete it. A
  comment that only paraphrases an ADR is a review finding.
- ADRs become slightly more load-bearing: an agent that needs the full
  rationale must open the ADR. This is the intended direction — one
  source of truth, and the doc-sync gate already guards it.
- The density of the current tree is what future agents imitate, so this
  sweep is also what makes the rule stick. Re-verify the ratio during
  `/quality-sweep` rather than trusting the convention to hold on its own.
- **Revisit trigger:** if an agent breaks something a deleted comment had
  covered, that is evidence against the rule for that class of comment —
  restore it and record the case here. Empirical, not settled by taste.
