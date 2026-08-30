---
name: refine-iteration
description: Numbered procedure for taking a whole iteration's needs-refinement tasks to refined in one conversation and one pull request, by merging their questions into one deduplicated agenda instead of holding the same conversation once per task. Entry point when more than one task in an iteration needs refining.
---

# Refine an iteration

`refine-task` is the procedure for one task and every rule in it still
applies here — the taxonomy sweep, `Constraints` recording the answers,
`**None.**` only once the sweep is done, and the product owner's merge being
what actually grants `refined`. This does not replace it; it changes the
**unit** from one task to one iteration, for the reason
[ADR-0047](../../../docs/adr/0047-refinement-is-batched-per-iteration.md)
records.

One iteration, never several. An iteration is a coherent piece of product
with shared vocabulary and one `Done when`; questions merge across its tasks
because they are about the same thing. Across iterations they are not, and
merging them produces a long agenda with no theme.

## Procedure

1. Read the iteration index — its `Done when` above all — then every task
   file in it, and everything those link: the ADRs, the
   `docs/architecture.md` sections, the tasks in other iterations they name.
   Read all of it before writing a single question. The whole point is to see
   the questions together.
2. Sweep [the template](../../../docs/tasks/template.md)'s fixed ambiguity
   taxonomy per task, exactly as `refine-task` step 3 requires. Produce a
   per-task list first, unmerged. Merging before sweeping loses the questions
   a single task would have raised.
3. **Merge the agenda.** Most of the saving is here, and it is real work
   rather than concatenation:
   - Questions several tasks ask in different words are **one decision**.
     Record which tasks each decision binds; you will need that in step 5.
   - Some answers make other questions disappear. A decision about how a
     cellar is made public settles what the public cellar page shows, so the
     second question is not asked — it is derived.
   - A question no task's `Scope` actually depends on is not an agenda item.
     Refinement is for what blocks or shapes the work, not a survey.
4. **Order the agenda so upstream decisions come first**, then put it to the
   product owner in rounds of a few questions, not one question per message
   and not twenty at once. After each round, re-derive: an answer may have
   just settled or reshaped later questions, and asking one it settled wastes
   the thing this procedure exists to conserve. No code changes while the
   conversation is open — `refine-task` step 4.
5. Record each answer as `Constraints` **in every task file it binds**. A
   decision binding several tasks is written once and pointed at from the
   others, never copied — [ADR-0020](../../../docs/adr/0020-documentation-roles.md)
   applies to task files too. If the decision has a rejected alternative
   whose reasoning would not survive in a task file, it earns an ADR
   ([ADR-0032](../../../docs/adr/0032-when-a-decision-earns-an-adr.md)); write
   it and link it from the tasks instead of restating it in each.
6. **Move only the tasks whose questions are all answered to `refined`.** A
   batch is not all-or-nothing: a task still holding an open question stays
   `needs-refinement` and says so, rather than being carried over the line by
   the ones around it. That is the failure this whole format exists to
   prevent.
7. Run `node scripts/check-tasks.mjs`, then `make verify-fast`, and open one
   pull request for the iteration per `docs/PULL_REQUEST_TEMPLATE.md` —
   carrying task-file edits only, no code (`CLAUDE.md` "Refine in one PR,
   implement in another"). Name in the description which tasks moved to
   `refined` and which deliberately did not.

## When a refined task has gone stale

Refining ahead means a task can be `refined` for weeks before anyone
implements it, and the work done in between can invalidate it — the cost
ADR-0047 accepts. If implementation contradicts what the task file says,
**stop and re-refine it**; do not improvise the difference. Reopening one
task costs a short conversation. Implementing against a stale request costs
the review that finds it, and a task file that then disagrees with what
shipped is the drift `CLAUDE.md`'s first goal exists to prevent.
