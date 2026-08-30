# ADR-0048: A CLAUDE.md bullet keeps the rule and sheds the reason

- **Status:** accepted
- **Date:** 2026-08-30

## Context

`CLAUDE.md` had reached 370 lines against a 200-line guideline — except that
the guideline was not in `CLAUDE.md`. [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md)
measures its own result "against a documented guideline of 200 lines", and two
iteration-5 task files cite "under 200 lines per `CLAUDE.md`". Nothing states
it. The number everyone reasons from has no home, no mechanism, and had been
exceeded by 85%.

The growth is not carelessness; it is the licence working as designed.
[ADR-0020](0020-documentation-roles.md) makes this file the one place allowed
to restate a rule that lives elsewhere, "since it is the only document loaded
unconditionally and a pointer here is one an agent never follows". Every gate
added since has taken that licence, correctly. What the licence never covered
is *rationale* — the paragraph after the rule explaining why the rule is what
it is — and that is most of what the file had accumulated.

Compacting it is riskier than it looks, and the risk is specific. Three
different things hide in that prose and only one is safely deletable:

- **The rule itself**, which sometimes only appears mid-paragraph. "Never
  start a task that is not `refined`" is not the whole rule; "only the product
  owner moves it there" is the half that stops an agent granting its own gate,
  and nothing mechanical enforces it.
- **Decisions with no other home.** Two were one edit from deletion. The
  rejection of a four-dimension subagent review per PR existed only here,
  citing ADR-0027 for reasoning that ADR did not contain — a dangling citation
  around a live decision, re-proposed by an outside review in the same week.
  "Refine in one PR, implement in another" had its reasoning in no ADR at all.
- **ADR-0020's protected class:** "a rule whose violation fails silently keeps
  its warning inline wherever an editor meets it — compressing that class of
  rule into a link is a regression dressed as tidying."

## Decision

**`CLAUDE.md` carries operative rules, the mechanics an agent needs in order to
comply with them, and warnings whose violation fails silently — and nothing
else. Rationale leaves this file only once an ADR holds it.**

What a bullet may keep:

- The operative rule, including any part of it that reads as prose. If
  deleting a sentence would let a correct-looking agent break the rule, that
  sentence is the rule.
- Mechanics required for compliance: who may perform a gated action, what a
  status means, the exceptions that bound the rule.
- Silent-failure warnings, per ADR-0020's protected class above.

What it may not keep: reasoning, measurements, history, worked examples, and
coverage lists that a skill or template already carries.

The deletion protocol, in order, because the order is what makes it safe:

1. Find the sentence's home and confirm the claim **literally**, by reading
   the target — not by remembering that it is probably there.
2. If it has no home, **migrate first**: amend the owning ADR, or write one
   if the decision has none. Then delete.
3. If it is neither a rule nor homeable rationale, it was descriptive prose
   and can go.

The budget is **200 lines**, stated in `CLAUDE.md` itself so that ADR-0039's
citation and the task files' resolve to something real. It is a guideline with
no checker; see Consequences.

**Not decided here:** what any rule says. This governs only what `CLAUDE.md` is
allowed to hold and how a line leaves it.

## Alternatives considered

**A `docs/hazards.md` gathering the gotchas, with `CLAUDE.md` instructing
agents to read it.** The product owner's proposal, and the most attractive on
line count. Rejected because nothing would load it. That is the exact failure
[ADR-0038](0038-in-repo-spec-driven-process.md) rejected `constitution.md`
for, and ADR-0039 has already measured the underlying premise: the
code-comment policy was violated repeatedly *while present in full* in the one
always-loaded document, so a file an agent must remember to open is weaker
still. The mechanism that does work is `.claude/rules/`, which loads itself on
a matching read — but it binds a file type, and the hazards in question bind
either a subtree (already in `backend/README.md`, which auto-loads) or nothing
at all (the Docker port collision).

**Delete `## Quality checks` entirely, since `/quality-sweep` holds its
mechanics.** Rejected on two findings, both checked rather than assumed. The
"not adopted" rejection existed in no ADR, so deleting the section would have
destroyed the only record of a live decision. And the skill sets
`disable-model-invocation`, so it does not appear in an agent's skill list at
all: the instruction to *suggest* it at an iteration boundary is undeliverable
from inside the thing being suggested. The section compresses; it cannot move.

**Strip every bullet to its bold statement.** The largest saving, and the
proposal that prompted this ADR. Rejected because it cannot distinguish the
three things listed in Context. Applied to "Never start a task that is not
`refined`" it deletes "only the product owner moves it there", which is the
operative half; applied to the vulnerability-scan bullet it deletes the
boundary between a fix that may be pushed unasked and one that may not.

**Move whole gates — doc-sync, code-review, iteration DoD — into
`implement-task`.** This reaches 200 lines and is the only option that does.
Rejected for now because it trades unconditional loading for a skill
invocation, and ADR-0020's warning is precisely that a pointer here is one an
agent never follows. Worth reopening as its own decision rather than smuggling
it into a compaction pass.

**A `check-claude-md.mjs` enforcing the budget.** Rejected by the product
owner. It is the option ADR-0039's own test points at — a decidable rule that
nothing guards is the shape that just failed — and the argument against it is
real too: a line-count gate rewards terse-but-worse prose and would fail pull
requests for a reason unrelated to their content. Recorded as a live option in
the revisit trigger rather than as a closed question.

## Consequences

- Good, because `CLAUDE.md` drops from 370 to 260 lines — 30% — with no rule
  or decision lost, verified sentence by sentence rather than asserted.
- Good, because two decisions that were one careless edit from disappearing
  now have ADR homes: the four-dimension rejection in ADR-0027, and refinement's
  separate pull request in ADR-0026.
- Good, because the next compaction has a rule to follow and does not have to
  re-litigate `hazards.md`. The failure mode of a tidying pass is silent, and
  a written protocol is the only thing that makes it reviewable.
- Bad, because the budget is re-homed **without a mechanism**, which is the
  same unenforced-guideline shape that produced the 85% overrun in the first
  place. ADR-0039's test says a rule this decidable earns a checker; this
  decision knowingly declines one.
- Bad, because at 260 lines the file still does not meet the budget it now
  states. That gap is honest rather than hidden, but a document that fails its
  own stated rule invites the rule being ignored — which is how the 200 became
  a phantom the first time.
- Bad, because step 1 of the deletion protocol is manual. Nothing checks that
  a deleted sentence has a home; the audit has to be run, and an agent in a
  hurry can skip it exactly as it can skip any unguarded gate.
- Neutral, because no rule changed. Every gate, exception and warning that
  bound an agent before this ADR binds it after; only the prose around them,
  and where the reasoning lives, is different.
- **Revisit trigger:** if `CLAUDE.md` passes 200 lines again, the guideline has
  failed twice unguarded and `check-claude-md.mjs` is the next thing to try —
  advisory first, since the objection to it was about failing PRs rather than
  about measuring.

## Evidence

**The phantom guideline**, on `dev` at 7ef8895: `grep -rn "200 line\|200-line"`
returns ADR-0039 line 151, and iteration-5 task files 17 and 19 — both citing
`CLAUDE.md` — and **no hit in `CLAUDE.md` itself**.

**The compaction**, measured: 370 → 260 lines. `## Workflow` was 204 of the
370 (55%) and is where the reduction came from; `## Repository layout` merged
into `## Project`; `## Quality checks` went 22 → 13; the two "fail silently"
bullets under `## Commands` were deleted as duplicates of `backend/README.md`
lines 62 and 77–86, which auto-loads on touching `backend/` (ADR-0035).

**The rule-loss audit.** Every sentence over 60 characters in the old file's
`## Commands` onward was extracted and matched by 8-word shingle against the
new file and against a corpus of every ADR, `docs/*.md`, every `SKILL.md`,
`.claude/rules/`, both subtree READMEs, the root README and the `Makefile`.
Thirty-four sentences no longer appear in `CLAUDE.md`. Five matched the corpus
literally; the remaining twenty-nine were classified by hand and every one
resolved to either a reworded survival in `CLAUDE.md` or a verified home —
the acceptance-criteria rule in ADR-0026, the refinement-conversation guidance
in `docs/tasks/template.md`, the worktree teardown facts in the `worktree`
skill, the `DW-N` coverage mechanics in ADR-0026's 2026-08-15 amendment, and
"when a rule outgrows the README's one-line bar, write the ADR" in ADR-0020
line 74. Nothing was found homeless at the end of the pass.

**One obsolete rule was deleted rather than moved**: the `gh` /`GITHUB_TOKEN`
bullet. `gh auth status` reports keyring authentication with no token, and
plain `gh` works in a non-interactive shell, so both the environment variable
and the `zsh -ic` wrapper it prescribed were stale.
