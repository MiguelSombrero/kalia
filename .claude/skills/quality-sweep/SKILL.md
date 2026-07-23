---
name: quality-sweep
description: Runs a periodic, whole-codebase quality audit (architecture, documentation, code-quality, security) and appends a MoSCoW-categorized task list to docs/roadmap.md's Quality backlog, opened as a PR. Product-owner-initiated only.
disable-model-invocation: true
context: fork
agent: general-purpose
---

# Quality sweep

A periodic, whole-codebase check — broader than any single PR's diff can
judge. See `CLAUDE.md` "Quality checks" for how this fits the rest of the
process.

## 1. Spawn subagents in parallel

Use the Agent tool with `subagent_type: Explore` for each dimension below
(read-only audits — findings only, no fixes). Launch all four in a single
message, multiple tool calls. Each Explore agent starts cold with no
memory of this conversation, so give it a full, self-contained prompt.

For every dimension, the prompt must ask for: concrete `file:line`
references, a one-sentence rationale per finding, and explicitly instruct
"this is an audit — report findings only, do not fix anything."

**architecture-quality**
Compare `docs/architecture.md` and every file under `docs/adr/` against
the current codebase. Flag: drift between documented and actual module
boundaries or API conventions; violations of documented dependency rules
(e.g. ArchUnit-enforced layering); decisions that look outdated given how
the code has actually evolved (check `docs/architecture.md` §8 "Trade-offs
made explicit" and §9 "Revisit list" for standing decisions and their
stated trigger conditions — flag any whose trigger has been met).

**documentation-quality**
Audit every file under `docs/` and every `README.md` in the repo for
staleness (describes something that no longer matches the code) and
duplication (the same fact stated in two places that could drift apart).
A fresh, independent pass — assume nothing already checked is correct.

**code-quality**
Audit the whole codebase (`backend/src`, `frontend/`) for: security smells
(injection, XSS, hardcoded secrets, insecure defaults, auth flaws),
performance issues (N+1 queries, unbounded loops, algorithmic complexity,
resource leaks), correctness risks (unhandled edge cases, error handling
gaps, race conditions), and maintainability issues (duplication, unclear
naming, missing test coverage for non-trivial logic).

**security**
Whole-system security review beyond what a single diff can show — e.g.
end-to-end auth flow soundness (token handling, session storage,
authorization checks on every protected endpoint), whether public vs.
protected boundaries match what's documented, and any systemic pattern a
per-PR review would miss because it only sees one file at a time. If the
project genuinely has no meaningful attack surface yet (e.g. no auth
system exists), it's fine to report that as the finding — don't skip this
dimension in advance of running it; let the subagent itself conclude
there's nothing to report if that's true.

## 2. Categorize and write the backlog

Collect all findings from all four subagents. Categorize each MoSCoW-style:

- **MUST** — a real bug, drift that actively misleads, or a security gap
- **SHOULD** — a real improvement, not urgent
- **COULD** — a nice-to-have, low-impact polish item

Edit `docs/roadmap.md`'s "### Quality backlog" subsection (under
"## Iteration 5+ — Backlog") to list the findings under their category,
each with a one-line description and file reference. Replace the "Empty
until the first sweep runs" placeholder text only if something was
actually found — if a sweep genuinely finds nothing, leave it as-is and
say so in the PR description instead of inventing findings to fill it.

## 3. Open a PR

Branch `docs/quality-sweep-<date>` off up-to-date `dev`. Commit the
`docs/roadmap.md` change. Push and open a PR whose description lists
every finding directly (not just "see the diff") so the product owner can
react without opening the file — this PR is the primary way they see the
sweep's output. Follow the standing auto-PR workflow (`CLAUDE.md`
"Workflow").
