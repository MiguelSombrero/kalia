# ADR-0047: Refinement's unit is one iteration, not one task

- **Status:** accepted
- **Date:** 2026-08-30

## Context

Iteration 5.5 closed on 2026-08-29. On 2026-08-30 this repository held **zero
tasks at `refined`** and twenty-five at `needs-refinement`, spread across
iterations 6, 6.5, 7 and 8. Nothing could be started, and no amount of
implementation capacity would change that.

Only the product owner moves a task to `refined`
([ADR-0026](0026-task-file-format.md), `CLAUDE.md`), and getting there means
a conversation. So the rate at which work can begin is the rate at which those
conversations happen. Under one-task-per-conversation, twenty-five tasks is
twenty-five conversations and twenty-five pull requests.

Everything this project has optimized recently sits downstream of that.
[ADR-0027](0027-process-weight.md) chose the cheapest implementation mode,
[ADR-0046](0046-edit-time-checks-and-one-verify-gate.md) collapsed
verification into one gate, and the `implement-task` skill ordered the gates.
None of them touch the constraint. A usage report over 64 sessions proposed
going further in the same direction — dispatching parallel agents, one worktree
each, across an iteration's refined tasks. That cannot run here, and not for a
scheduling reason: there are no refined tasks to dispatch. The queue is empty
at the stage before the one being optimized.

The second observation is that refining one task at a time re-does work.
An iteration's tasks share vocabulary, a `Done when`, and often a single
underlying decision asked in several different wordings — and the task files
already say so themselves, cross-referencing each other's open questions by
number. That cross-referencing is not an accident of authorship: `refine-task`
step 6 already requires that an answer changing a dependent task's `Scope` or
`Open questions` updates that task file too, in the same pull request. The
one-task unit therefore already breaks whenever answers cross tasks, which is
most of the time.

## Decision

**Refinement's unit is one iteration: its tasks' open questions are swept per
task, merged into a single deduplicated agenda, answered with the product
owner in a few rounds, and landed as one refinement pull request.**

What this covers, and what it does not:

- **The merge is the point, not the batching.** Concatenating twenty-five
  questions into one message saves nothing. Collapsing several tasks' wordings
  of one decision into one question, and *deriving* the questions an earlier
  answer settles instead of asking them, is where the saving is. The
  `refine-iteration` skill makes that its own step for that reason.
- **One iteration, never several.** An iteration is a coherent piece of
  product; its questions merge because they are about the same thing. Across
  iterations they are not, and later iterations frequently depend on decisions
  an earlier one has not made yet.
- **Partial batches are normal and expected.** Only tasks whose questions are
  all answered move to `refined`. One still holding an open question stays
  `needs-refinement` and says so, rather than being carried over the line by
  the ones around it.
- **`refine-task` keeps its job**, unchanged: a single task, one added after
  its iteration was refined, one that comes back stale. `refine-iteration`
  delegates the per-task mechanics to it rather than restating them.
- **The gate is untouched.** The product owner still moves a task to
  `refined`, still by merging the diff that does it. Nothing here lets an
  agent grant it, in a batch or otherwise.
- **A decision binding several tasks is written once and pointed at**, never
  copied into each — [ADR-0020](0020-documentation-roles.md) applies to task
  files. If it has a rejected alternative whose reasoning would not survive in
  a task file, it earns its own ADR
  ([ADR-0032](0032-when-a-decision-earns-an-adr.md)).
- **[ADR-0026](0026-task-file-format.md) is amended, not contradicted.** Its
  "tasks are refined just in time — immediately before work starts, not at
  iteration planning" is the sentence this replaces, and it says so there.
  Everything else in that bullet stands.
- **Not decided here:** what a task file contains (ADR-0026) or which
  ambiguity categories get swept ([ADR-0038](0038-in-repo-spec-driven-process.md)).
  Only the unit changes.

## Alternatives considered

**Keep one task per refinement conversation and pull request.** The status
quo, and it has a real strength this decision gives up: a task refined
immediately before it is implemented cannot go stale. Rejected on the
measurement above — the queue reached zero refined against twenty-five
waiting — and because the unit does not hold anyway. `refine-task` step 6
already forces a multi-task refinement pull request whenever an answer reaches
a dependent task, so the one-task unit describes the easy case rather than the
normal one.

**Refine every open task across all iterations in one pass.** Twenty-five
tasks in one sitting, maximising the saving. Rejected because the questions
stop merging once they leave an iteration: there is no shared theme, the
agenda becomes a survey, and iterations 7 and 8 hold questions whose answers
depend on decisions iteration 6 has not made. A long agenda without a theme is
how a refinement conversation turns into a form to be filled in — the failure
ADR-0026 built the `refined` status to prevent.

**Build the parallel implementation runner instead**, as the usage report
proposed. Rejected on two independent grounds. There is nothing refined to
dispatch, so it would optimize the stage after the empty queue. And
ADR-0027 already measured subagent-driven execution on this repository at
~1.1M tokens against ~100K for comparable work implemented directly, with its
two worst defects — a dropped RFC-required header and an ADR whose central
premise was false — escaping every review layer the heavier process added.
Neither ground is about parallelism being impossible; both are about it being
the wrong thing to build first.

**Let an agent move a batch to `refined` once it judges the questions
answered.** The only version that would remove the product owner from the
critical path, which is what the constraint actually is. Rejected because that
is not a bottleneck to be removed — it is the gate, and ADR-0026 states why
the status rather than an empty question list carries it.

## Consequences

- Good, because an iteration's shared context is read once instead of once per
  task, and a decision spanning three tasks is asked as one question rather
  than three.
- Good, because the product owner answers a themed agenda in one sitting
  rather than returning to the same subject across several sittings, days
  apart, having to reload it each time.
- Good, because it makes the cross-task consequence explicit at the moment of
  the decision, where `refine-task` step 6 currently discovers it afterwards
  and edits the neighbouring task file in response.
- Bad, because a task can now be `refined` weeks before anyone implements it,
  and the work done in between can invalidate it. Just-in-time refinement does
  not have this cost, and this decision buys throughput with it. The
  `refine-iteration` skill's closing section is the response — re-refine
  rather than improvise the difference — and re-refining is a real cost paid
  in real cases, not a theoretical caveat.
- Bad, because a refinement pull request touching ten task files is harder to
  review than one touching a single file, and a mistake in a shared constraint
  propagates to every task it was pointed into rather than sitting in one.
- Neutral, because the task file format, the ambiguity taxonomy and the
  `refined` gate are all unchanged; only the unit of the conversation moves.
- **Revisit trigger:** if re-refinement from staleness becomes routine rather
  than occasional, the batch is running too far ahead of implementation, and
  the unit should shrink toward the handful of tasks actually next rather than
  the whole iteration.

## Evidence

**The queue, measured 2026-08-30**, by reading every `- **Status:**` line
under `docs/tasks/iteration-*/`: iteration 5.5 ten of ten `done`; iterations
6, 6.5, 7 and 8 holding ten, nine, three and three tasks respectively, **all
twenty-five `needs-refinement`, none `refined`.**

**The overlap, in iteration 6's first four task files.** Twenty-two open
questions, of which at least four are one decision asked two or three times —
and the files say so in their own text rather than this being an outside
reading:

| Decision | Asked in |
|---|---|
| 404 or 403 for a private cellar | task 02 q1; task 04 q2, which says it "must match whatever task 02 question 1 settles" |
| Whether a public cellar is indexable | task 02 q3, which says it "may land in task 04 instead"; task 04 q3, which says the directive "is set here even if the decision is made there" |
| How an owner previews their own public cellar | task 02 q4; task 03 q4, "Related to task 02 question 4"; task 04 q1 |
| What identifies a user, and so what the shareable URL is | task 01 q2, which notes it "decides what a public cellar's URL looks like"; task 03 q5; task 04 q6 |

Answering these four in task 02's own refinement would, under `refine-task`
step 6, require editing tasks 01, 03 and 04 in that same pull request — which
is the batch, arrived at by a different route and without the deduplication
that makes it cheaper.
