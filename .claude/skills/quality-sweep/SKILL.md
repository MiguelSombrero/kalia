---
name: quality-sweep
description: Runs a periodic, whole-codebase quality audit (architecture, documentation, code-quality, security) and appends a MoSCoW-categorized task list to docs/tasks/quality-backlog.md, opened as a PR. Product-owner-initiated only.
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
Two passes, not one — drift-checking alone misses designs that are
perfectly doc-compliant but still bad, and decisions that were sound once
but no longer are:

*Drift:* compare `docs/architecture.md` and every file under `docs/adr/`
against the current codebase. Flag drift between documented and actual
module boundaries or API conventions, and violations of documented
dependency rules (e.g. ArchUnit-enforced layering).

*Quality, independent of drift:* evaluate the architecture on its own
merits, not just whether it matches the docs. Module/layer coupling and
cohesion; whether dependencies point in a sound direction, not merely a
documented one; whether cross-module boundaries respect real
encapsulation (a module reaching into another's internals instead of its
published API is a violation even if no doc forbids it); "program to
interfaces, not implementations" and similar principles applied at the
architecture grain — how the big pieces relate to each other. (The same
principles applied *inside* one class or component — a class doing too
much, coupling to a concrete type instead of an interface within a single
component — are a code-quality finding, not this one; this dimension
stops at the module/layer boundary.)

*Challenge the decisions, not just check them:* read `docs/architecture.md`'s
"Trade-offs made explicit" section and `docs/tasks/backlog.md`, and for each
deliberate choice or deferral, ask whether it's still sound given how the
system has actually grown
— flag it even if its stated revisit trigger hasn't fired, if you can show
it's now hurting maintainability, scalability, security, or another
"-ility." A stated trigger is a floor for when a decision must be
revisited, not a ceiling on when it may be questioned.

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
naming, missing test coverage for non-trivial logic, and class/method-level
design smells — a class doing too much, coupling to a concrete
implementation where an interface would decouple it, deep inheritance
where composition would serve better). This is SOLID-style scrutiny
*inside* one class or component; the same principles applied *across*
modules or layers are architecture-quality's job, not this one.

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

## 2. Categorize and merge into the backlog

Collect all findings from all four subagents. Categorize each MoSCoW-style:

- **MUST** — a real bug, drift that actively misleads, or a security gap
- **SHOULD** — a real improvement, not urgent
- **COULD** — a nice-to-have, low-impact polish item

For each finding, also judge its readiness: **ready** (the fix is
unambiguous — no competing approaches, no new behavior to define, could go
straight into a task as written) or **needs decision** (a genuine choice
only the product owner can make — e.g. two valid remediation paths, or a
documented-but-unbuilt feature that could be built or have the doc
reworded instead). Don't guess at how a "needs decision" item should
resolve — just flag it.

`docs/tasks/quality-backlog.md` groups findings by severity only (MUST /
SHOULD / COULD), never by sweep date — a finding lives at one permanent ID
for its whole life, so the same issue is never listed twice just because
two sweeps both found it. Read the current file in full before writing
anything, then for each new finding:

- **Matches an existing entry** (same underlying issue — same file/area
  and same root cause, even if the wording differs): update that entry in
  place — bump its `*(confirmed <date>)*` to today, and revise the
  description only if the details materially changed (a new line number,
  a concrete repro that didn't exist before, a changed severity). Keep its
  ID. Do not add a second entry for the same issue.
- **No longer reproducible** even though nothing else in this sweep
  explicitly fixed it: move it to the "Retired" section with a one-line
  resolution note, same as an explicitly-confirmed fix.
- **Genuinely new**: append it to the end of its MUST/SHOULD/COULD section
  with the next unused ID in that category — one past the highest ID ever
  issued there, counting both the live list and the "Retired" section (an
  ID is permanent and never reused once assigned, even after the finding
  it named is resolved or lifted).

Do **not** bump the confirmed-date of an entry this sweep's subagents
didn't happen to re-find — an old date just means "not independently
re-verified this time," not that the finding is stale or needs attention;
forcing every entry's date to today every sweep would reintroduce the
same all-entries-touched noise this format exists to avoid.

Mark each "needs decision" finding inline (`**[needs decision]**`) right
after its confirmed-date. Each finding still needs a one-line description
and file reference. If a sweep genuinely finds nothing new and nothing to
reconfirm, make no changes to the file and say so in the PR description
rather than inventing findings to fill one.

## 3. Open a PR

Branch `docs/quality-sweep-<date>` off up-to-date `dev`. Commit the
`docs/tasks/quality-backlog.md` change. Push and open a PR whose
description lists every new or updated finding directly (not just "see the
diff") so the product owner can react without opening the file — this PR
is the primary way they see the sweep's output. For an updated (not new)
finding, say briefly what changed (confirmed-date only, or the description
too). Follow the standing auto-PR workflow (`CLAUDE.md` "Workflow").
