# ADR-0045: One verify gate, run at edit time as a report and at push time as a block

- **Status:** accepted
- **Date:** 2026-08-30

## Context

A usage report over 64 Claude Code sessions on this repository, generated
2026-08-30, grouped the recurring friction. Almost none of it was in the work
itself — 40 of 50 analysed sessions fully achieved their goal. It was in the
machinery around the work, and every item is mechanical:

- CI was the first thing to report failures a local run would have caught:
  the frontend boundary lint on a new test file, the comment-policy checker,
  the API-client drift check after a springdoc annotation change.
- `/code-review` bound to a different worktree than the implementation and
  reviewed the wrong commit range — reporting cleanly, because a review of
  the wrong diff still produces a review.
- Worktrees were cut from a local `dev` that had not been fetched, and eight
  of them were later found abandoned, holding 2.0 GB.
- Parallel review agents were lost to session limits with the plan held only
  in conversation, so resuming meant re-exploring rather than reading.
- ADR-0034 was written twice under one number, because two sessions each read
  `docs/adr/` and each saw 0033 as the highest.

Nothing here is a judgement failure that a firmer instruction would fix. This
repository has already decided what that means:
[ADR-0039](0039-mechanisms-for-recurring-rule-violations.md) says a rule
agents keep breaking earns a mechanism rather than a restatement, and
[ADR-0038](0038-in-repo-spec-driven-process.md) that deterministic checks stay
the enforcement mechanism.

Two standing positions block applying that here, and both are this
repository's own.

The first is the root `Makefile`, whose header said agents follow `CLAUDE.md`'s
`## Commands` section and not its targets, "so there is exactly one place
either of us has to keep in sync". The reasoning was sound and the outcome was
not: the list of checks now exists in `ci.yml`, in `CLAUDE.md`, in both
subtree READMEs and in the `Makefile`, and an agent assembling it by hand each
time is how a check gets left out.

The second is ADR-0039, which considered a `PreToolUse` hook injecting the
comment rule before every edit and rejected it on cost against benefit: a
shell command on every edit, per-machine trust, and hook-injected text with no
more binding force than the rule file already has. That reasoning holds for
what it rejected. It does not reach a hook that *runs a checker*, whose output
is a verdict on the tree rather than prose the model may weigh. And the cost
half is now measured rather than estimated: each checker runs in about 40 ms.

What did not happen is worth stating plainly. ADR-0039's revisit trigger was
"if violations still reach CI after the checker lands". That is not what
fired; the survey above is. The trigger was a floor for when the decision had
to be reopened, not a ceiling on when it could be — the same reading
[the quality sweep](../../.claude/skills/quality-sweep/SKILL.md) applies to
every stated trigger.

## Decision

**`make verify` becomes the single verification gate that agents and people
both run, and the repository's checkers additionally run at edit time as a
report to the agent rather than as a block.**

What this covers, and what it does not:

- **The `Makefile` stops being human-only.** `make verify` runs every check
  CI runs, in CI's order; `make verify-fast` is the subset needing neither
  Docker nor a build. `CLAUDE.md` and the skills name the target instead of
  restating what it runs, so the check list has one home
  ([ADR-0020](0020-documentation-roles.md)) and that home is executable. It
  builds the backend from clean, because CI always starts from a fresh
  checkout and an incremental local build can report success against stale
  compiled output — a gate that mirrors CI has to mirror that too.
- **A `PostToolUse` hook runs whichever checker covers the edited file**, and
  reports the failure into the agent's context. It never blocks. A checker
  legitimately goes red mid-task — a task file exists before its index row
  does — and a hook that fought that would be disabled within a week.
  `verify-fast` and CI stay the gates that actually fail.
- **The hook resolves the repository root from its own file location, never
  from the session's working directory.** Each worktree carries its own
  `.claude/settings.json` pointing at its own copy of the script, so a hook
  can only check the tree it lives in. This is the property that makes the
  wrong-worktree failure structurally impossible for the hook, rather than
  something an agent has to remember.
- **A committed `pre-push` hook runs `verify-fast`**, installed by
  `make install-hooks` as a copy rather than a symlink: the shared hooks
  directory outlives every worktree, and a link into one dangles when it is
  removed. `git push --no-verify` remains the deliberate bypass.
- **Long or fanned-out work checkpoints to `.claude/session-checkpoint.md`
  first** — branch, base ref, ordered steps, and the scope handed to each
  dispatched agent. Gitignored, because it describes the session rather than
  the change.
- **A review states its range.** `implement-task` prints `pwd` and
  `git log --oneline origin/dev..HEAD` before the pull request, and reports
  which gates ran and which were skipped. A gate with no verdict counts as
  skipped.
- **`make next-adr` allocates ADR numbers**, so two sessions reading the
  directory cannot both pick the same one.
- **Headless Claude is not wired into the push path.** It is documented as a
  command a person runs deliberately.
- **Not decided here:** what any checker checks. ADR-0017, ADR-0019 and
  ADR-0026 own that, and this ADR changes only when the checkers run and what
  happens when one fails.

## Alternatives considered

**Leave the `Makefile` human-only and restate the check list in `CLAUDE.md`.**
The cheapest option and the one the `Makefile` header already argued for.
Rejected because it is the failure [ADR-0020](0020-documentation-roles.md)
exists to prevent, and it has already happened: the check list is currently in
four places, and the drift is not hypothetical — sessions have pushed without
running the boundary lint because the list they assembled did not include it.
A target both parties run is the one-home rule applied to a list of commands
rather than a paragraph.

**A `PreToolUse` hook that blocks the edit.** Deterministic in the strongest
sense, and it was ADR-0039's own next-thing-to-try. Rejected because the
checkers judge the tree, not the edit: the edit that makes a checker red is
frequently correct and incomplete rather than wrong, and blocking it would
make the mechanism an obstacle to the work it is meant to guard. Reporting
after the fact costs one turn and fights nothing.

**Headless `claude -p` in the `pre-push` hook, auto-fixing what fails.** The
usage report's literal suggestion. Rejected because it rewrites the working
tree unattended, at the moment a person has decided the work is finished, and
spends tokens doing it. The round-trip it saves is the same one a
deterministic check saves by stopping the push and handing back the failure —
without an agent editing code nobody asked it to touch.

**Headless Claude in CI, fixing red pull-request branches and pushing.**
Genuinely closes the loop, since CI is where these failures surface today.
Rejected for now on security surface against benefit: it needs write-capable
CI credentials on a public repository, which is a materially larger exposure
than the problem — a handful of mechanical failures per iteration — justifies.
Named in the revisit trigger below.

**Commit the checkpoint as `NOTES.md` in the worktree,** as the report
suggested. Rejected because it would put session scratch in the diff of every
task. `.gitignore` already draws this line for `.superpowers/` and
`docs/superpowers/`, for the same reason.

**Symlink the `pre-push` hook instead of copying it.** Better in one respect:
editing `scripts/hooks/pre-push` would take effect without reinstalling.
Rejected because `.git/hooks` is shared by every worktree and outlives all of
them, so a symlink into the worktree that happened to install it breaks
silently when that worktree is removed — which is exactly the environment
drift this ADR is trying to remove.

## Consequences

- Good, because the check list is executable and lives in one place. An agent
  that runs `make verify` cannot omit a check by assembling the list wrong,
  which is the failure mode the four copies produced.
- Good, because the edit-time report reaches the agent while it still has the
  file in context, and costs about 40 ms — the cost premise ADR-0039 could
  only estimate is now measured, and it is negligible.
- Good, because the hook is bound to its own worktree by construction rather
  than by an agent remembering to check `pwd`.
- Bad, because the `Makefile` is now load-bearing for agents, so it must track
  `ci.yml` — the drift removed between `CLAUDE.md` and the `Makefile` is
  bought back as drift between the `Makefile` and the workflow, and nothing
  checks that pair. It is a shorter distance than four documents, not zero.
- Bad, because a hook is trusted per machine and `make install-hooks` is a
  step nobody is forced to run. A contributor who does neither gets exactly
  the behaviour that exists today, silently. This is the same
  no-mechanism-relied-on-alone caveat ADR-0039 recorded, and CI remains the
  backstop for the same reason.
- Bad, because `make verify` needs Docker and several minutes while
  `verify-fast` takes about ten seconds, so which one satisfies the gate is a
  judgement an agent can get wrong in the lenient direction. `implement-task`
  requires saying which was run, which makes the choice visible rather than
  correct.
- Neutral, because nothing about what a checker checks changes. ADR-0017's
  test, ADR-0019's structure rules and ADR-0026's coverage rules are
  untouched; only their timing and their delivery are new.
- **Revisit trigger:** if failures `verify-fast` would have caught still reach
  CI after this lands, the gap is a hook nobody installed or a push that used
  `--no-verify`, and the CI-side headless auto-fix rejected above becomes the
  next thing to try.

## Evidence

Measured on 2026-08-30 in this repository, on the branch that introduced the
targets.

**Checker cost, the premise ADR-0039 could not measure.** Each checker, run
against the full tree: `check-adrs.mjs` 0.03 s, `check-tasks.mjs` 0.03 s,
`check-comments.mjs` 0.04 s. The hook runs only the checkers that cover the
edited path, so a source-file edit pays 0.04 s and a docs edit 0.03 s.

**`make verify-fast`** — the three checkers, `npm run lint` and 274 frontend
unit tests across 53 files — completed green in **10.5 s** wall clock. That is
the gate the installed `pre-push` hook runs, and it is why the fast/full split
is drawn where it is.

**The hook was exercised, not assumed.** Fed the `PostToolUse` payload for an
edit to a file under `docs/adr/`, with the tree clean, it produced no output
and exited 0. Fed a payload for a file outside the repository, it exited 0
without running anything. With a deliberately malformed task file present, an
edit to that file produced the `additionalContext` payload carrying
`check-tasks.mjs`'s own `FAIL` line, and exit code 0 — reported, not blocking,
as Decision requires.

**The `pre-push` hook was verified on a real push**, from a linked worktree,
with the hook installed in the shared `.git/hooks`. It ran `verify-fast`
against the worktree being pushed rather than the main checkout, and the push
proceeded once it was green — the case that matters, since `git rev-parse
--show-toplevel` resolves inside git's own hook environment there, not the
one a manual invocation provides.

**Two bugs in this change were caught by reviewing it rather than by running
it**, and both are platform-specific in a way CI would never have shown:
`make api-drift` used GNU `timeout`, which is not installed on macOS, and
`make verify` built the backend incrementally where CI always builds from a
fresh checkout. Both are fixed here; the second is why Decision names the
clean build explicitly.
