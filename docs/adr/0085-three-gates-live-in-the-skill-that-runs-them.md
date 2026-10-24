# ADR-0085: Three gates live in the skill that runs them, so CLAUDE.md can fit its budget

- **Status:** accepted
- **Date:** 2026-10-24
- **Supersedes:** [ADR-0048](0048-what-survives-a-claude-md-bullet.md) (partial) — its "rejected for now" verdict on moving whole gates into `implement-task`, and the revisit trigger that pointed at an advisory checker instead

## Context

[ADR-0048](0048-what-survives-a-claude-md-bullet.md) set `CLAUDE.md`'s budget at
200 lines and compacted the file from 370 to 260. Its revisit trigger fired on
2026-09-29 (270 lines) and a second pass, confined to rationale, history and
descriptive prose, reached only 252: what remained was rules. It named the one
option that reaches the budget — moving whole gates into `implement-task` —
and left it open as its own decision. Every process PR since added lines and
none removed any; by 2026-10-24 the file was 266 lines, a third over the budget
it states about itself.

Iteration 9 must add two more things that apply to every edit and so cannot
leave the file: the Expo "check the docs, not memory" warning, which is the
same silent-failure class as the Next.js one, and the no-new-costs constraint.
The file needs headroom before that, not after.

Three gates were the candidates because `implement-task` already orders each
of them: doc-sync (step 7), `/code-review` (step 8) and the iteration
definition of done (step 11). `CLAUDE.md` restated all three in full, and the
skill pointed back at `CLAUDE.md` for their text — a circle in which the
always-loaded copy carried the wording and the procedure carried the order.

## Decision

**The doc-sync, code-review and iteration-DoD gates are stated in full in
`implement-task`, and `CLAUDE.md` keeps a short pointer to them that also names
what each one requires.**

The skill's steps 7, 8 and 11 now carry the wording that `CLAUDE.md` held,
including the task-file exception to doc-sync and the pre-task-file rule for
iterations 0–4. The `CLAUDE.md` pointer says, in one sentence each, what the
gates require, so an agent that never opens the skill still knows they exist
and what they ask. The budget stays 200 lines and gains no checker.

Alongside the move, the same pass applied ADR-0048's deletion protocol to
descriptive prose and rationale that had a home elsewhere (the repository tree
in the root README, the per-suite commands in each subtree README, the
screenshot rationale in `.claude/rules/no-screenshots.md`), and corrected two
bullets that said something false: the ADR bullet now states all three of
[ADR-0032](0032-when-a-decision-earns-an-adr.md)'s tests, and the "not
adopted" bullet no longer misstates the sweep's dimensions (five, per
[ADR-0051](0051-process-retrospection-belongs-to-the-sweep.md)).

**Not decided here:** what any gate says. This moves where three gates are
written down, not what they require.

## Alternatives considered

**An advisory `check-claude-md.mjs` that reports the line count.** The option
ADR-0048's revisit trigger named, and the one ADR-0039's test points at: a
decidable rule that nothing guards is the shape that has now failed twice.
Rejected by the product owner on 2026-10-24. A checker measures the overrun
but does not remove a line, so the file would sit over budget with a warning
beside it; and a line-count gate rewards terse-but-worse prose, the objection
ADR-0048 already recorded.

**Raise the budget.** Rejected: the budget is the price every session pays in
context for a file loaded unconditionally, and a number revised upward each
time it is crossed stops being a budget. 200 stays.

**Another prose-only pass.** Rejected as the sole remedy: two passes already
took everything that was rationale or history, and the second stopped at 252
because the remainder was rules. It is still part of the answer, because moving
three gates alone does not reach 200 (see Evidence), but it cannot be the whole
of it.

**Move more gates than these three** — the new-dependencies and
vulnerability-scan rules in particular. Rejected: neither is run by one skill.
A dependency or a CVE finding appears mid-task in any skill or outside all of
them, so a pointer would be followed less often than a rule restated here,
which is ADR-0020's warning. The three that moved are the ones a single skill
already sequences.

**Keep the gates in `CLAUDE.md`.** Rejected for the reason above: it leaves no
room for iteration 9, and the skill's wording would keep pointing back at a
file it duplicates.

## Consequences

- Good, because `CLAUDE.md` fits its 200-line budget with nine lines to spare
  for iteration 9's two additions, and the next addition no longer arrives
  already over budget.
- Good, because each of the three gates now has one full statement, in the
  procedure that orders it, where it used to have two that could drift.
- Bad, because an agent that does not invoke `implement-task` reads only the
  `CLAUDE.md` summary of these gates. That is the pointer-that-is-never-followed
  risk ADR-0020 names; the summary keeps what each gate requires so the rule is
  present even if the detail is not, but the doc-sync exception for the task
  file and the iteration-close detail are now one invocation away.
- Bad, because the planning-time half of the iteration-DoD gate (check that an
  iteration's "Done when" is covered when it is planned) now sits in a skill
  that runs at implementation time. `scripts/check-tasks.mjs` still checks that
  half mechanically ([ADR-0026](0026-task-file-format.md)); the sentence in
  step 11 is a reminder, not the guard.
- Bad, because the budget is still enforced by nothing but this record and the
  line count a reviewer can take with `wc -l`. The failure it has now shown
  twice remains possible a third time.
- Neutral, because no gate changed. The skill, `docs/roadmap.md` and the PR
  template cite the gates by their new home.
- **Revisit trigger:** `CLAUDE.md` passes 200 lines a third time. Then the
  advisory checker is the remaining option, and the question is whether the
  product owner still rejects it.

## Evidence

Measured on 2026-10-24 on the branch cut from `dev` at 5556e7c, with
`wc -l CLAUDE.md`.

**Size.** 266 lines before, 191 after: 75 lines removed. The four gate bullets
(doc-sync, code-review, iteration DoD, acceptance criteria) were 21 lines and
are now one 5-line pointer, so 16 of the 75; moving gates alone would have
left 250. The remaining 59 came from the repository tree and per-suite command
block (each held by a README), the skills list and the screenshot rationale
(held by the skills' own descriptions and `.claude/rules/no-screenshots.md`),
and tightened phrasing in the dependency, vulnerability-scan, checkpoint,
review-dialogue and quality-sweep bullets. Those trims dropped citations and
examples, not operative rules: the ADR-0039 link on the code-comments bullet
(ADR-0017 stays), the amendment date on the ADR-0020 citation, and "no code
change" from the lockfile-bump exception.

**Where each removed sentence went.** The gate wording is in
`.claude/skills/implement-task/SKILL.md` steps 7, 8 and 11; the repository tree
is `README.md`'s; the suite commands are `backend/README.md` and
`frontend/README.md`'s; the screenshot rationale is
`.claude/rules/no-screenshots.md`'s.
