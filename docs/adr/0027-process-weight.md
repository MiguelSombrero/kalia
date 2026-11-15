# ADR-0027: Match process weight to task size — implement directly by default

- **Status:** accepted
- **Date:** 2026-07-31
- **Amended:** 2026-08-30 — records the rejection of a four-dimension subagent
  review on every task before every PR, which had lived only in `CLAUDE.md`
- **Amended:** 2026-08-30 by [ADR-0051](0051-process-retrospection-belongs-to-the-sweep.md)
  — the sweep those four dimensions run in gained a fifth, `process-quality`;
  the rejection below is unchanged and still names four

## Context

An AI-agent session can execute a roadmap task in several ways. It can
implement directly and run `/code-review`. It can run a design-exploration
skill such as `/feature-dev`, which explores alternatives before committing to
one. It can run a subagent-driven workflow such as
`/superpowers:subagent-driven-development`, which dispatches each plan step to
a fresh subagent with its own context.

Nothing said which to use when. The heavier modes present as the more rigorous
choice — more review layers, more explicit reasoning, a written plan — so an
agent left to choose reaches for them, and this repository's stated goal is a
professional quality bar rather than speed. Two questions were unanswered: what
the heavier modes actually cost here, and whether the extra layers catch
defects that the light mode misses.

The same question applies to the written implementation plan those modes
produce, which is a cost regardless of which mode consumes it.

## Decision

**Implement directly and run `/code-review`; a heavier process must earn its
place against the size of the task in front of it.**

- **Direct + `/code-review`** is the default and the right answer for most
  roadmap tasks. Nearly every `docs/tasks` item is a single- or few-file
  change: settle any open decision with the product owner, implement it, run
  the review, open the PR.
- **A design-exploration skill** (e.g. `/feature-dev`) is for a genuinely new
  subsystem whose design is still open and where comparing alternatives pays —
  an iteration introducing a new module. Its cost is roughly flat regardless of
  task size, so it is a poor fit for small tasks and a fair one for large.
- **Subagent-driven execution** is for a change spanning enough files that one
  context would overflow. Its cost scales with the number of plan tasks, making
  it the worst fit for many small ones.

**Skip the implementation plan; never skip the task file.** A written plan's
main consumer is subagents, so when implementing directly the brainstorming
dialogue and the resulting ADR carry the decision instead. The task file is a
different artifact — the *request* rather than the plan for building it,
written before the work and agreed with the product owner
([ADR-0026](0026-task-file-format.md)).

This governs process weight only. It relaxes no gate: the doc-sync,
code-review, dependency-confirmation and iteration-DoD gates apply identically
whichever mode is chosen.

## Alternatives considered

**Always use subagent-driven execution.** The most rigorous-looking option, and
the reason the question arose. Rejected on the measurements in Evidence: an
order-of-magnitude cost increase, and the two worst defects it produced were
not caught by any of the layers it added. Its review layers check the diff
against the spec, so they catch drift between the two but share the spec's
blind spots.

**Always write an implementation plan, even when implementing directly.**
Rejected because a plan's readers are subagents starting cold. When one context
holds the whole task, the plan is written and read by the same context that
already knows its contents, and the decisions worth keeping outlive it in the
ADR — which is written anyway.

**Leave the choice to agent judgment, unwritten.** This was the status quo, and
it is what produced the measurements below: absent a written default, the mode
that looks most thorough wins. Rejected because the failure is systematic
rather than a lapse — the signal an agent reads (more layers = more rigour)
points the wrong way.

> **Amended 2026-08-30.** One more alternative belongs here, and had been
> carried in `CLAUDE.md` alone since before this ADR was written:
>
> **A full four-dimension subagent review — architecture, documentation, code
> quality, security — on every task before every PR.** Rejected, and it stays
> rejected. Architecture and documentation need more context than one small
> task provides, so running them at that frequency would be noisy and would
> re-litigate settled decisions. The measurements above cut the same way: the
> heavier process's review layers did not catch its two worst defects, so
> adding four more per task buys layers rather than defects found. What this
> repository runs instead is `/quality-sweep` — the same four dimensions, at
> the whole-codebase grain where they have the context to be worth reading,
> and only when the product owner asks.
>
> Two things this rejection does *not* cover, so that a future reading does
> not stretch it. It is about a **swarm on every diff**, not about a single
> reviewer: `/code-review` is a gate and stays one. And it is not an argument
> against running the change — `implement-task` step 9 exercises the flow
> against a live stack, which is a different activity from reviewing a diff
> and was added precisely because no amount of diff-reading catches a Server
> Action that 404s at runtime.
>
> Recorded here because it was a decision with no ADR home: `CLAUDE.md` stated
> it and cited this ADR for the reasoning, which made the citation a dangling
> one and the record deletable by any compaction pass
> ([ADR-0048](0048-what-survives-a-claude-md-bullet.md)).

## Consequences

- Good, because the default mode is now the cheap one, and reaching past it
  requires naming which condition of the two heavier modes applies.
- Good, because the cost of a mode is written down rather than re-estimated per
  session.
- Bad, because "enough files that one context would overflow" is a judgment
  call made before the work starts, when the file count is least known. An
  agent that guesses low pays for a context overflow mid-task.
- Neutral, because the measurements are specific to this repository's task
  sizes and to the agent versions that produced them; they bound the decision
  rather than establishing a general ratio.
- **Revisit trigger:** a task genuinely spanning a module-sized change, where
  the direct mode's context limit is reached rather than predicted.

## Evidence

Measured on this repository, 2026-07-27 to 2026-07-30:

- **Subagent-driven execution, eleven dispatches: ~1.1M tokens**, producing
  ~60 lines of Java and one ADR.
- **Subagent-driven execution on a docs-only file split: >1M tokens.**
- **Comparable work implemented directly: ~100K tokens.**

The two worst defects in that work — a dropped RFC-required header, and an ADR
whose central premise was false — surfaced in the product owner's review and by
running the code. Neither was caught by any review layer in the heavier
process.

Command-output cost, measured 2026-07-31 on a warm build (relevant because it
is the recurring per-task cost the light mode still pays):

| Command | Lines | Bytes |
|---|---:|---:|
| `mvn test` (12 unit tests) | 47 | 2.5 KB |
| `mvn verify` (+ 7 Testcontainers ITs) | 285 | 34 KB |
| `npm test` (102 tests, 28 files) | 14 | 0.5 KB |

Only `mvn verify` is large enough to be worth filtering, and the filtered
command in [backend/README.md](../../backend/README.md) is the response —
about 8K tokens per invocation against a ~100K-token direct task.
