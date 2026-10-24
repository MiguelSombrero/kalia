# Task 18: The PR record and the skills match how work is actually done

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**Gate verdicts have no place in the PR.** `implement-task`'s Gates section and
[ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md) require the
`pwd`/range lines and a verdict per gate ("a gate with no verdict counts as
skipped"), but `docs/PULL_REQUEST_TEMPLATE.md:45-67` has no section for them,
and "or the final message" lets the report vanish with the session. No
`/code-review` verdict appears in about a third of code PRs (#212 to #353, and
#382 and #385 since), and the `pwd`/range lines in none of the 22 PRs #358–#392.

**The template's own examples are stale.** Its test-plan examples (`:48-49`)
predate `make verify`; its doc-sync list (`:61-63`) omits the iteration index
the CLAUDE.md gate requires and adds "the two READMEs" it does not name. It
says a browser check is "required for UI changes per CLAUDE.md" (`:53-54`),
which no CLAUDE.md since 1977ec2 says, and `implement-task` step 10 says the
template "already requires" it — circular. The `worktree` skill cites an
"`implement-task` step 0" that does not exist (`:34-35`).

**The iteration-close checklist names only the roadmap.** CLAUDE.md's
"Iteration DoD gate" and `implement-task` step 11 name only `docs/roadmap.md`'s
Status, so the README status and feature list and `docs/architecture.md`'s
"Next" line drifted at the close of 5.5, 6 and 7 (#196, #231, #306). The
iteration-8 close was clean only because a task cleared the drift first.

**The worktree skill misses two steps.** A fresh worktree has no
`frontend/node_modules` and the Start steps do not install it: #200, #202 and
#255 recorded `verify-fast` failing until `npm ci`, and the edit hook silently
skips ESLint without it (`scripts/hooks/post-edit-check.mjs:39`, `:48`). The
Finish steps wait for a merge that happens after the session ends, so they
never run: about 2.7 GB of merged worktrees sit under `.claude/worktrees/`
today, beside an empty directory from 2026-09-11.

**Two process texts contradict a rule.** The refinement skills say
"task-file edits only, no code", while CLAUDE.md requires an unrelated CVE to
be fixed "in place … never a second PR" (refinement PR #309 carried a
`pom.xml` override). And `docs/ci-playbook.md:189-193` says `--wait` on the
one-shot `keycloak-config` exits 1, while `README.md:114`, ADR-0054:65,
`scripts/check-keycloak-realm-config.mjs:267` and `Makefile:79` pass it, and CI
(`ci.yml:239`) does not — one side is wrong.

## Scope

Every PR has a slot that records each gate's verdict, and the template's
examples and citations are current. Closing an iteration updates every
document that states its status. A fresh worktree verifies without a manual
`npm ci`, and merged worktrees get removed. The refinement skills state the
CVE exception, and `--wait` is used one way everywhere, the one that works.

## Constraints

- [ADR-0051](../../adr/0051-process-retrospection-belongs-to-the-sweep.md) and
  [ADR-0027](../../adr/0027-process-weight.md): no new per-task step whose cost
  outweighs what it catches.
- [Task 08](08-claude-md-within-its-budget.md) decides what CLAUDE.md may
  hold; a checklist change lands in the skill if task 08 moves the gate there.
- CLAUDE.md "Never commit … a screenshot" applies to any template wording
  about browser checks.

**Decided at refinement, 2026-10-24** (product owner):

- **The `worktree` skill's Start step removes merged worktrees** first, confirming each PR merged with `gh pr view` and skipping any with unpushed work. A `make` target was rejected as one more thing to remember.
- **A browser check of UI changes becomes a real rule** in `implement-task`, described in words with no screenshot committed, and the template points at it.
- **`--wait` is settled by running it**, not by choice: the implementer runs `docker compose up --wait` with `keycloak-config` on the current Compose and makes every file use the form that works.
- **The gates section is carried by the template**; whether a checker also enforces it follows from [task 08](08-claude-md-within-its-budget.md) moving the gates into `implement-task`, and is the implementer's proposal in the PR.

## Open questions

**None.**

## Acceptance criteria

- [ ] The PR template has a gates section, and `scripts/check-tasks.mjs` or a
      new checker with a `node --test` test fails a task-completing PR body
      missing it — or, if refinement rejects a checker, the template alone
      carries it
- [ ] The iteration-close checklist names the README status and feature list
      and `docs/architecture.md`'s "Next" line
- [ ] Following the `worktree` skill on a fresh worktree gives a green `make
      verify-fast` with no extra step
- [ ] `docker compose up --wait` with `keycloak-config` was run on the current
      Compose, and every file uses the form that works
- [ ] No process citation points at nothing — `node scripts/check-links.mjs`
      green, and `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-58, SHOULD-59,
COULD-49, COULD-55, COULD-51, COULD-53, COULD-56 and SHOULD-54. SHOULD-54's
`[needs decision]` becomes a measurement here: which side is right is
something running it settles.
