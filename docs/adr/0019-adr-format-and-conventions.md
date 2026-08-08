# ADR-0019: A fixed ADR structure, with alternatives and costs given their own sections

- **Status:** accepted
- **Date:** 2026-07-26
- **Amended:** 2026-07-27 — `scripts/check-adrs.mjs` now enforces the index
  and status checks in CI; see the updated Consequences entry

## Context

Eighteen ADRs exist and none of them was written against a template. There is
no skeleton file, no README in [adr/](.), and no convention recorded in
`docs/architecture.md` or `CLAUDE.md` specifying required sections, status
vocabulary, or metadata fields. `CLAUDE.md` names ADRs repeatedly but always
as process — when to write one, when to propose one instead of relitigating —
never as form.

So the form propagated by imitation, and imitation carries no correction
mechanism: each ADR copied the shape of its neighbours, including whatever had
already drifted. Product-owner review
([iteration 3, task 13](../tasks/iteration-3.md)) raised it against
[ADR-0018](0018-frontend-env-var-validation.md), whose Decision section reads
as a specification of files and function calls rather than a statement of what
was decided. An audit of the full set found that this is not one document's
problem: the corpus has diverged on where the decision is stated, where
rejected options live, and whether a cost is recorded at all.

The forces that make this worth fixing rather than tolerating: these documents
are the project's stated source of truth for design intent, they are read
mainly by agents who load one file without its neighbours, and their most
perishable content — why an option was rejected — is exactly the content the
current shape places least reliably.

## Decision

**ADRs follow a fixed five-section structure — Context, Decision,
Alternatives considered, Consequences, and an optional Evidence — with
[template.md](template.md) as the normative skeleton.**

The two sections that are new relative to what the corpus had been doing carry
the weight of this decision. `## Alternatives considered` gives rejected
options a guaranteed home rather than leaving them to be scattered through
Context and Decision or omitted. `## Evidence` gives measured framework
behaviour somewhere to live that is not Context, whose lack of any competing
purpose had made it the default destination for everything.

The rules the template enforces:

- **The Decision section opens with the decision**, in one self-contained
  sentence. A reader who jumps to the heading finds the verdict in its first
  line and nowhere else.
- **Context states the problem, not the answer.** No verdict, no measurement,
  no weighed option — each has a section.
- **Decision is not a specification.** File names, signatures, control flow
  and configuration values live in the code; they appear in an ADR only where
  the choice of file was itself the decision.
- **Consequences must record at least one Bad or Neutral entry.** A decision
  with no cost is a decision whose cost has not been found yet.
- **`Status` holds a vocabulary token only** — `proposed`, `accepted`,
  `superseded`, `partially-superseded`, `deprecated`. Explanation moves to the
  optional `Supersedes`, `Superseded-by`, and `Amended` fields, which is also
  what makes supersession mechanically checkable rather than free prose.
- **Iteration and task references are markdown links**, never bare numbers.
  [ADR-0006](0006-cellar-first.md) already records that this roadmap's
  numbering has been reshuffled more than once, which is what makes a bare
  "iteration 3 task 8" a dangling reference in waiting.
- **The index in `docs/architecture.md` §9 carries no prose.** Its title
  matches the file's H1 verbatim and its status cell holds the bare token.
  Explanation of a supersession lives in the ADR's own fields and nowhere
  else — the two copies of ADR-0004's status text had already drifted apart,
  which is the drift [ADR-0017](0017-code-comment-policy.md) describes for
  comments, in a different medium.
- **Amend, do not rewrite.** An accepted ADR records what was believed when it
  was written, and that record is most of its value. A correction gets an
  `Amended` field; a reversal gets a new ADR and a `Superseded-by` field.

Applying the structure to the existing eighteen is deliberately partial: the
five documents whose Decision section fails its reader are restructured by
relocating text, and the rest receive metadata and index fixes only. Rewriting
sound records to match a new template would cost more than it returns and
would edit history to look like it always agreed with the present.

## Alternatives considered

**Adopt MADR verbatim.** The industry-standard template — Context and Problem
Statement, Decision Drivers, Considered Options, Decision Outcome, Pros and
Cons of the Options, More Information — with the widest recognition outside
this project and the least bikeshedding. Rejected on cost-to-benefit: it
renames every heading in all eighteen files, and its six sections are heavier
than most decisions here warrant. Its two genuinely load-bearing ideas — that
options get a section, and that consequences are explicitly Good/Bad/Neutral —
are adopted; the ceremony around them is not. MADR's `Good, because` /
`Bad, because` phrasing is taken verbatim, since a convention that reads as a
sentence is harder to fill in vacuously than a `Cost:` label.

**Rules without new headings.** Keep Context/Decision/Consequences and add
written rules instead: Decision must lead with the verdict, alternatives must
be a labelled block inside Context, Consequences must include a cost. Cheapest
option, and it touches no existing heading. Rejected because it leaves
alternatives inside Context, which is where the current drift already put them
in the four ADRs that bothered — a rule that says "put it in a labelled block
in Context" is the convention that just failed, restated more firmly. A
section is self-enforcing in a way a paragraph-placement rule is not: its
absence is visible, and a reader knows where to look without being told.

**Do nothing; treat the corpus as immutable.** ADRs are records, and the
strongest argument against this whole change is that reformatting an accepted
decision edits a historical document. Rejected, but it is what bounds the
scope above: the restructure is limited to relocating existing sentences in
five files, with no sentence rewritten, precisely so the record survives the
reformatting. The alternative to acting is that ADR-0018 keeps a Decision
section that does not state its decision, and the next ADR copies it.

## Consequences

- Good, because the rejection reasoning for a decision now has one predictable
  location instead of five, and its absence is visible as an empty section
  rather than invisible as an omission.
- Good, because a reader — usually an agent holding this file and not its
  neighbours — reaches the decision in the first line of the section named
  for it.
- Good, because `Status` becomes a token, so supersession is checkable rather
  than inferred from prose, and the two files whose amendments were recorded
  only in the index now record them themselves.
- Bad, because the corpus is now deliberately inconsistent: five ADRs carry the
  new structure, thirteen carry the old, and a reader cannot assume either.
  This is the accepted price of not rewriting sound records, and it decays as
  ADRs are amended over time rather than needing a second sweep.
- Bad, because four ADRs (0007–0010) keep a Consequences section with no cost
  recorded. Supplying one means inventing content rather than relocating it,
  which is a larger liberty to take with an accepted record than reformatting
  is. The rule prevents recurrence; it does not repair these.
- Neutral, because most of this still rests on the doc-sync gate in
  `CLAUDE.md` noticing, the same mechanism that missed the index twice in
  eighteen additions. `scripts/check-adrs.mjs`, added in CI 2026-07-27, now
  catches an index row going missing or drifting from its file (title,
  status) and — for ADRs that have adopted `Alternatives considered` — a
  Consequences section with no `Bad,`/`Neutral,` entry. It does not check
  that the Decision section actually opens with the verdict, which is a
  semantic property the original ADR-0018 problem turned on and no
  mechanical check here verifies.
- **Revisit trigger:** if an ADR is written after this and still lands with an
  empty or absent `Alternatives considered`, the section is not carrying its
  weight and the gap belongs in a mechanical check rather than a written rule
  — the argument [ADR-0017](0017-code-comment-policy.md) makes about letting
  the enforcement mechanism set the weight.

## Evidence

The audit behind the Context section, over all eighteen ADRs as of
`bb241e1`:

**Where the decision is stated.** Two ADRs announce it in Context and not in
Decision: [ADR-0016](0016-security-response-headers.md) at
`**Decided: no-nonce.**`, and [ADR-0018](0018-frontend-env-var-validation.md)
at "So the decision is `register` catching the validation error…". In both,
`## Decision` is a specification — a five-item header listing and a
control-flow description respectively.

**Where alternatives live.** Absent in 9 of 18. In the remainder: one unweighed
clause in Context (0003, 0004, 0007); enumerated in Context but rejected in
Decision (0014, 0015); inside Decision (0012); a bolded pseudo-heading in
Context (0016, 0018).

**Whether a cost is recorded.** 9 of 18 record none (0006–0011, 0013, 0014,
0018). Where negatives appear they carry five different labels: `Cost:`
(0002–0004), `Risk accepted:` (0005), `Known gap, not fixed here:` (0012),
`Revisit trigger:` (0016, 0017), and unlabelled (0015).

**Section growth.** Context runs 2–7 lines in ADR-0001 through 0006 and 14–86
lines in ADR-0013 through 0018 — 56% of ADR-0017 and 61% of ADR-0018.
Consequences stayed at 3–5 bullets throughout. The section with no competing
purpose absorbed the growth; the section carrying trade-offs never grew, which
is the structural reason a dedicated Evidence section is worth its heading.

**Index drift.** `docs/architecture.md` §9 instructs "Add a row when adding an
ADR" and stopped at ADR-0016; ADR-0017 and ADR-0018 had no row despite both
being committed and linked elsewhere. ADR-0016's indexed title carried a
` (no-nonce CSP)` suffix absent from its H1, and ADR-0004's status text
differed verbatim between file and index.

**Amendment recording.** Four mechanisms in use: prose stuffed into `Status`
(0004, 0005), a dated italic `*Note (…)*` block (0006), folded silently into
Decision prose (0013), and index-only (0013 again — its own `Status` field did
not record that [ADR-0015](0015-configuration-strategy.md) had amended it).
