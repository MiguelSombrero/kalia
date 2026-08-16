# ADR-0020: Each documented fact has one home — ADR why, architecture shape, README how

- **Status:** accepted
- **Date:** 2026-07-27
- **Amended:** 2026-08-15 by
  [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md) — the `CLAUDE.md`
  carve-out below does not apply where a path-scoped rule can deliver the rule
  instead

## Context

Four document types carry prose about how this codebase works: `docs/adr/`,
`docs/architecture.md`, the two READMEs, and `CLAUDE.md`. Nothing has ever
said which one owns what, so all four accumulated the same rules
independently.

An audit of every convention bullet in both READMEs against the other three
found twelve topics stated in two places and several in three (see Evidence).
The duplication is not stylistic: it has already produced contradictions
inside a single file, because two copies of a rule are two things to update
and only one of them gets updated.

This matters more here than in most repositories. The primary reader is an
agent that loads one file without its neighbours, so a stale copy is not
merely redundant — it is the only thing that reader sees, and it is wrong.
[ADR-0017](0017-code-comment-policy.md) already reached this conclusion for
code comments, naming ADR-restating prose "the only unguarded drift surface
here." The same argument applies one level up, to the documents themselves.

The forces pulling the other way are real, which is why a blanket
"never repeat anything" rule would be wrong: an agent holding only
`frontend/README.md` genuinely needs enough context to avoid a mistake, and
some rules exist precisely because breaking them fails silently.

## Decision

**A documented fact lives in exactly one document, chosen by what kind of fact
it is; every other mention of it is a one-line pointer with a link.**

The three homes:

- **ADRs record why** — the problem, the options weighed, the reason one was
  chosen, and what it cost. This is the only place rejected alternatives are
  written down, which is what makes it the least replaceable of the three.
- **`docs/architecture.md` records shape** — the module map, layer direction,
  data flow, and the cross-cutting structure a reader needs before opening any
  code. It describes how the parts relate, not how to write a given file.
- **READMEs record how** — the commands and day-to-day rules for working in
  that codebase, at the granularity the product owner set for them: short
  enough that a developer or agent catches the intention immediately.

Two carve-outs, stated here so they are not later mistaken for drift:

- **`CLAUDE.md` may restate anything an agent must have without opening a
  second file.** It is the only document loaded unconditionally, so the cost
  of a pointer there is an agent that never follows it. The code-comment
  policy keeps its full form in `CLAUDE.md` while both READMEs reduce to a
  link. This exception is bounded by its justification: it covers rules that
  apply to *every* edit, not everything an agent might find useful.

  > **Amended 2026-08-15.** The code-comment example no longer holds: that
  > policy moved to `.claude/rules/code-comments.md`, and `CLAUDE.md` keeps a
  > pointer. The carve-out itself stands, narrowed — see Consequences and
  > [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md).

- **A convention whose violation fails silently keeps its warning inline,
  wherever an editor will meet it.** The test is
  [ADR-0017](0017-code-comment-policy.md)'s own: if breaking the rule fails a
  test, an ArchUnit rule or the build, that mechanism is the guard and one
  line plus a link suffices; if it fails silently, or only in production
  builds, the warning stays. Compressing that class of rule into a link an
  agent will not follow is a regression dressed as tidying.

When a rule outgrows the README's one-line bar and has no ADR, that is the
signal to write the ADR — not to let the README section grow. Three such
rules existed when this was written and became
[ADR-0021](0021-design-tokens-ui-primitives.md),
[ADR-0022](0022-loading-error-empty-states.md) and
[ADR-0023](0023-typed-api-failures.md).

## Alternatives considered

**READMEs own every convention; ADRs and `architecture.md` link to them.**
The simplest rule to apply and the easiest to check mechanically — one
location, no judgement about which kind of fact something is. Rejected
because it collapses the distinction that makes ADRs worth keeping: a README
records what the rule *is*, and has no natural place for what was rejected
and why. `architecture.md` would also stop working as a standalone overview,
since understanding the module structure would mean opening two READMEs.

**Decide per topic, with no written rule.** Rejected on the evidence that
this is precisely what produced the current state. Every duplicated passage
here was added by someone making a locally reasonable choice; the drift is
the aggregate of many such choices, so the fix has to be a rule rather than
better individual judgement.

**Do nothing — accept duplication as the cost of readable standalone docs.**
The honest case for this is that every pointer costs the reader a file open,
and agents do not always follow links. Rejected because the duplication is
already demonstrably wrong in two places rather than merely redundant, and
because the `CLAUDE.md` carve-out above captures the legitimate part of the
argument without licensing the rest.

## Consequences

- Good, because a rule now has one place to change, so an update cannot leave
  a stale copy behind — which is what produced both contradictions found in
  the audit.
- Good, because it gives the "too small for an ADR" README bar a matching
  upper bound: a convention that no longer fits on a line has outgrown the
  README and needs an ADR, which is a decidable test rather than a judgement
  call.
- Bad, because reading a README now requires following links to understand
  *why* a rule exists, and an agent that does not follow them has strictly
  less context than before. The silent-failure carve-out limits the damage to
  rules whose violation is recoverable, but it does not eliminate it.
- Bad, because the boundary between "shape" and "how" is genuinely blurry for
  some topics — testing strategy sits on it, and reasonable people will place
  it differently. The rule reduces the number of copies without making every
  placement obvious.
- Neutral, because `scripts/check-adrs.mjs` cannot verify any of this. It
  checks ADR structure and the index, not whether a fact appears in two
  documents; nothing mechanically detects a README bullet growing back into a
  paragraph.
- **Revisit trigger:** if a future audit finds duplication has re-accumulated
  despite this rule, the missing piece is enforcement rather than intent —
  and the check would need to compare prose across documents, which is a
  materially harder thing to build than the structural checks that exist now.

> **Amended 2026-08-15.** The first carve-out above — that `CLAUDE.md` may
> restate a rule an agent must have without opening a second file — is
> justified by a pointer being one an agent may never follow. That justification
> now has an exception. A `.claude/rules/` file with `paths:` frontmatter is
> loaded by the tool when a matching source file is read, so it is not a
> pointer: nothing has to be followed.
>
> Where such a file can deliver a rule, the carve-out does not license a copy
> in `CLAUDE.md`, and the one-home rule applies unchanged — the rule moves,
> and `CLAUDE.md` keeps a pointer. The code-comment policy, which this ADR
> cites as the carve-out's own example, is the first rule to move; see
> [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md) for the two
> tests that decide which rules qualify.
>
> The carve-out stands unchanged for everything else, including rules whose
> violation fails silently and which no glob can scope — the second carve-out
> is untouched.

## Evidence

The audit behind Context, over `backend/README.md` (213 lines),
`frontend/README.md` (186), `docs/architecture.md`, `CLAUDE.md` and all
nineteen ADRs, as of `c8fd5cf`.

**Volume.** The audited convention sections were 158 of 213 lines (74%) in
the backend README and 138 of 186 (74%) in the frontend README, the latter
across 21 bullets of which five ran 8–17 lines.

**Twelve topics were ADR-backed and restated anyway**, most near-verbatim:
code comments (0017), package structure (0007), configuration (0015), logging
(0013), error handling (0014), springdoc `requiredMode` and Jackson
`non_null` (0012), TanStack Query (0008), Zustand (0009), react-hook-form and
Zod (0010), orval (0012), i18next (0011), security headers (0016). The
logging section was a paragraph-by-paragraph re-flow of ADR-0013's Decision,
down to the same `log.warn("Beer {} not found", id)` example.

**The code-comment policy existed four times** — `CLAUDE.md`,
ADR-0017, and byte-identically in both READMEs.

**`docs/architecture.md` was a third copy** for module boundaries (§3, with
ADR-0007 and the backend README), testing strategy (§7), Flyway version
numbering (§3), and WCAG (§5) — the last of which it also duplicated
internally, at lines 236–244 and again at 270–271.

**Two contradictions had already resulted**, both from a copy updated in one
place only:

1. `frontend/README.md` said `react-i18next` "is installed but not wired —
   wire it when one does" at line 88, and that it "is now wired through
   `app/providers.tsx`" at line 145. Same file, both statements true when
   written.
2. `docs/architecture.md:210` said "no component library until a real need
   appears" while `frontend/components/ui/` held five primitives.

**The pointer pattern this ADR generalizes was already in the repository**,
applied inconsistently: `docs/architecture.md:190` ends its error-handling
bullet with "(see backend/README.md error-handling convention)" and line 277
ends the testing paragraph with "(backend/README.md testing conventions)".
Both are four to five lines standing in for thirty.
