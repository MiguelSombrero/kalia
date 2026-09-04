# ADR-0032: An ADR is earned by a rejected alternative, not by a decision's size

- **Status:** accepted
- **Date:** 2026-08-07
- **Amended:** 2026-08-08 — added the second test below: a decision earns an
  ADR only when it binds work *now*
- **Amended:** 2026-09-04 — added a third test: whether the task file that
  made the decision is itself a sufficient home for it

## Context

Thirty ADRs exist, written over twenty-three days. Three documents already
govern them, and none answers the question this one asks.
[ADR-0019](0019-adr-format-and-conventions.md) fixes their *form*.
[ADR-0020](0020-documentation-roles.md) fixes their *home* relative to
`docs/architecture.md` and the READMEs. [ADR-0027](0027-process-weight.md)
fixes how much *process* a task carries. Nothing states when a decision earns
an ADR at all.

That gap has a direction. Writing one is always the defensible choice in the
moment — it is the more rigorous-looking act, and this repository's stated
goal is a professional bar rather than speed, the same asymmetry ADR-0027
found for process weight. So the count can only ratchet, and no reviewer has a
stated bar to push back with.

The product owner raised it as a worry about pace, and proposed a remedy:
merge ADRs that concern one subject, taking the authentication cluster
([ADR-0025](0025-authjs-valkey-adapter.md),
[ADR-0028](0028-resource-server-and-current-user.md),
[ADR-0029](0029-silent-token-refresh.md),
[ADR-0030](0030-per-session-token-storage.md), with OIDC Back-Channel Logout
still to come as iteration 4 task 10) as the example.

Two forces shape the answer beyond the count itself. The corpus is read mainly
by an agent that loads one file without its neighbours — the premise ADR-0019
and ADR-0020 both build on — so a document's boundaries determine what a
reader gets. And thirty files in a flat, numerically-sorted directory present
as sprawl whether or not each one is justified, because nothing in `docs/adr/`
groups them.

## Decision

**A decision earns an ADR when a credible alternative was rejected *and* the
reason would not survive in the code, `docs/architecture.md`, or a README;
grouping related decisions is the index's job, not the document's.**

The test is the one [ADR-0020](0020-documentation-roles.md) already implies by
calling rejected alternatives "the only place" they are written down and
therefore "the least replaceable of the three" homes. This ADR makes it the
admission criterion rather than a description of what ADRs happen to contain.

What follows from it:

- **A library or tool choice with no seriously-weighed alternative is a README
  line, not an ADR.** The version and the usage rule belong where READMEs
  already hold them; without a road not taken there is nothing an ADR uniquely
  preserves.
- **A rule whose reasoning is fully carried by its enforcement can be a
  pointer rather than an ADR** — the argument
  [ADR-0017](0017-code-comment-policy.md) makes for comments, one level up. If
  an ArchUnit rule or a test states the constraint and its failure message
  explains it, an ADR adds a second copy to keep in step.
- **`**None.** X was the only realistic option because …` stays valid and
  becomes load-bearing.** The template already permits it; under this decision
  it is the author asserting they looked, which is what distinguishes a
  genuine absence of alternatives from an unexamined one.
- **A sequence of decisions on one subject stays a sequence of documents.**
  Same subject is not same decision. The operative test is whether each could
  have gone the other way without disturbing the others; where it could, they
  are separate decisions however closely their subject matter sits. The
  authentication cluster is four independent choices — a frontend dependency
  and session store, a backend token-validation and identity-key model, the
  failure semantics of renewal, and a storage key — and each is independently
  reversible.
- **Thematic navigation lives in [README.md](README.md)**, a grouped index of
  every ADR. That is the artifact answering "show me the authentication
  decisions"; merging documents to achieve the same view would trade a
  retrievable record for a browsable one.

This changes nothing already written. No ADR is merged, renumbered, or
rewritten, and ADRs 0001–0010 keep the shape ADR-0019 deliberately left them
in.

> **Amended 2026-08-08 — the second test.** The rule above says *what* earns an
> ADR and is silent on *when*. Add: **a decision earns an ADR only when it binds
> work now. A possibility being carried is a backlog item.**
>
> Both tests must pass. A rejected alternative on work nobody has committed to
> is a design sketch, and filing it as an ADR gives it authority it has not
> earned — the document then reads as settled to every later author, including
> an agent loading it without its neighbours.
>
> The evidence is [ADR-0004](0004-backend-cart.md) and
> [ADR-0005](0005-defer-auth-mock-payments.md), deprecated the day after this
> ADR was written. Both designed a store flow that was never built and, once
> the vision changed on 2026-08-08, never will be. Neither was idle while it
> waited: ADR-0004 put three empty schemas in PostgreSQL and a `STORE` node in
> `docs/architecture.md`'s diagram, so for three weeks the system looked like
> one that was going to sell beer. That is the specific harm — not the file
> count this ADR was written about, but a speculative decision quietly becoming
> a constraint.
>
> The test cuts the other way too, and that is the point of stating it: the
> right response to deprecating those two was *not* a third ADR recording that
> the own store was rejected. Nothing is being built on that rejection. It is a
> backlog line.
>
> This does not license deferring a decision that binds work now merely because
> the work is unstarted. The trigger is whether an ADR-shaped question stands
> in front of a task someone is about to do — the brand/bottle split in
> iteration 5 earns one; how beers might one day be priced across shops does
> not.

> **Amended 2026-09-04 — the third test.** Even a decision that clears both
> tests above can still fail a third: whether a reader would ever need to
> find it who was not already going to open the task file that made it.
> **A decision earns an ADR only when its reasoning is something a
> *different* task, a different module, or `docs/architecture.md`'s shape
> will need later** — not merely because a credible alternative was
> rejected. A decision whose reasoning only the task that made it, and
> whoever implements it, will ever need stays in that task's own
> Constraints/Notes; the task file is itself a sufficient home for it, for
> as long as anyone will need it, and recording it a second time in an ADR
> adds a copy to keep in step rather than a home the first didn't already
> have.
>
> The evidence is a same-day round trip.
> [Iteration 6 task 13](../tasks/iteration-6/13-bottle-removal-lost-on-navigation.md)
> drafted a standalone ADR for dropping an undo affordance in favour of an
> immediate-commit confirmation dialog, passing both tests above — three
> credible alternatives were rejected, and the decision binds work now.
> Product-owner review caught what the two tests missed:
> [iteration 5 task 14](../tasks/iteration-5/14-edit-remove-bottle.md) made
> the *original* version of the same decision, after this ADR already
> existed, and recorded it in that task's own Constraints alone — no ADR,
> and nothing since has needed one. If the original decision's home held,
> its reversal's home holds too; the drafted ADR was retracted in the same
> pull request rather than merged and left for a later cleanup.

## Alternatives considered

**Merge ADRs by subject, starting with the authentication cluster.** The
product owner's proposal, and the strongest case available — the four are one
subject by any ordinary reading, and a reader wanting "how does auth work"
must currently open four files. Rejected on four counts. They are independent
decisions by the reversibility test above, so merging would assert a coupling
the code does not have. Their *sequence* is load-bearing content: ADR-0028
created the defect ADR-0029 fixed, and ADR-0030 fixed a defect ADR-0025
introduced, a chain legible today only because they are dated documents joined
by `Amended` fields — collapsed into one file it becomes a changelog. It
contradicts ADR-0019's "amend, do not rewrite," so it would need an ADR
superseding that rule rather than merely applying this one. And the benefit is
already delivered elsewhere: `docs/architecture.md` §6 narrates the whole
authentication design in one place and links out for the why, which is
ADR-0020's three-homes rule working as designed. The cost side is 659 lines in
one document before Back-Channel Logout is written, and seventeen inbound
references to repoint.

**Merge [ADR-0008](0008-tanstack-query.md), [ADR-0009](0009-zustand-ui-state.md)
and [ADR-0010](0010-react-hook-form-zod.md) into one client-state decision.**
The strongest merge candidate in the corpus, and unlike the authentication
cluster it passes the reversibility test only weakly: all three were written
the same day in one iteration, all were install-only with no consumer, and
ADR-0009 opens by naming ADR-0008 as the other half of a split it then renders
as a single three-homes table. Rejected by product-owner decision on
2026-08-07: it still contradicts "amend, do not rewrite" and breaks eight
inbound references, and the grouped index places them adjacently anyway.
Recorded here so the question is settled rather than reopened.

**Cap the corpus — a budget of ADRs per iteration.** The most direct answer to
a worry about pace, and mechanically checkable, which none of this decision
is. Rejected because the bar would be arbitrary and would bind hardest exactly
when consequential decisions genuinely cluster, as they did in iteration 4.
Worse, it is gameable in the wrong direction: the way to satisfy a cap is to
write fewer, larger, multi-decision ADRs, which is the merging this decision
rejects.

**Do nothing; treat ADR-0019, ADR-0020 and ADR-0027 as sufficient.** Defensible,
since between them they govern form, home and process weight, and the measured
pace is falling rather than rising (see Evidence). Rejected because none of
the three answers "should this be an ADR," and the measurements show the
corpus can grow by *filing* decisions that already existed as well as by
making new ones — six of the thirty arrived in a two-day backfill wave. A
falling rate with no stated bar is a fact about the current authors, not a
property of the process.

**Put the rule in `CLAUDE.md` instead of an ADR.** Cheapest, and `CLAUDE.md`
is the only document loaded unconditionally, so the rule would always be in
front of an agent. Rejected on ADR-0020's own carve-out, which covers rules
applying to *every edit*; this one applies only when a decision is made. It
also has rejected alternatives worth recording — this section — so by the test
it states, it earns an ADR. `CLAUDE.md` gets the one-line pointer that rule
prescribes.

## Consequences

- Good, because "should this be an ADR?" has a stated answer that is not "when
  in doubt, write one," and a reviewer has something concrete to push back
  with.
- Good, because the navigation problem behind the merge proposal is solved
  without editing a single accepted record.
- Bad, because the test is a judgment call and no check enforces it.
  `scripts/check-adrs.mjs` can verify an ADR is indexed and records a cost; it
  cannot verify that a rejected alternative was credible, and `**None.**`
  remains available to an author who did not look. The mechanism is review,
  which is the weaker guard ADR-0017 warns about.
- Bad, because the corpus does not uniformly satisfy its own bar: applied
  retroactively the test disqualifies several of ADRs 0001–0010, which stay in
  place. This is the same deliberate inconsistency ADR-0019 accepted for the
  same reason — rewriting sound records costs more than it returns.
- Neutral, because an ADR is now listed in two indexes, `docs/adr/README.md`
  and `docs/architecture.md` §9. They carry different content — grouping and
  a gloss against title, status and date — so neither restates the other, but
  it is a second place to update and `check-adrs.mjs` covers both because of
  it.
- **Revisit trigger:** an ADR landing with `**None.**` under Alternatives
  considered that a reviewer disputes, or the ADRs-per-merged-PR rate climbing
  back above the 0.41 baseline in Evidence — the first means the escape hatch
  is load-bearing, the second means the bar is not binding.

> **Amended 2026-09-04:**
>
> - Good, because a decision whose blast radius is genuinely one task now has
>   a stated reason it doesn't need an ADR, rather than the two-test formula
>   being read as "any credible alternative, anywhere, always."
> - Bad, because "would a reader who wasn't already going to open this task
>   file need it" is a third judgment call stacked on the first two, with the
>   same enforcement gap: nothing mechanical checks it, and an author who
>   wants an ADR can still write one under the letter of the first two tests
>   alone.
> - Neutral, because this amendment does not touch any ADR filed before it —
>   nothing here relitigates whether an existing ADR should have existed.

## Evidence

Measured on 2026-08-07 against the repository at the tip of `dev`, over the
thirty ADRs in `docs/adr/` (3,233 lines excluding `template.md`).

**Pace, normalised per merged pull request.** Counted from `git log --merges`
against ADR `Date` fields. The repository's git history begins 2026-07-24, so
earlier weeks cannot be normalised this way.

| Window | ADRs | Merged PRs | ADRs/PR |
|---|---|---|---|
| Jul 24–26 | 7 | 17 | 0.41 |
| Jul 27–Aug 2 | 9 | 31 | 0.29 |
| Aug 3–7 | 2 | 16 | 0.13 |

**The Jul 26–27 spike is not organic decision-making.** Nine ADRs were dated
across those two days. [ADR-0021](0021-design-tokens-ui-primitives.md),
[ADR-0022](0022-loading-error-empty-states.md) and
[ADR-0023](0023-typed-api-failures.md) each state in their own Context that
they are written after the fact, relocating reasoning that already existed in
`frontend/README.md` bullets and in gitignored design specs, because ADR-0020
had just decided that is where it belongs. ADR-0019 and ADR-0020 are the audit
and the corrective themselves. So six of the nine record decisions that
predate their own filing.

**Which ADRs carry a rejected alternative and a recorded cost.** Counting a
`## Alternatives considered` heading and a `- Bad,`/`- Neutral,` consequence
entry: present in ADRs 0011–0012, 0014, 0016, 0018–0030; absent in both
respects in ADRs 0001–0010, 0013, 0015 and 0017. That last group is not
uniform. ADR-0015 weighs two alternatives and records a cost in prose without
using either heading, and ADR-0017 records a cost the same way — the
pre-template shape ADR-0019 chose not to rewrite. ADRs 0001–0010 and ADR-0013
record no rejection reasoning at all: three of them (0003, 0004, 0007) name an
option in passing without saying why it lost, and the rest name none. This
agrees with the independent audit in ADR-0019's own Evidence, taken when the
corpus was eighteen files.

**Composition by subject.** Foundations 3 (0001–0003), product scope 3
(0004–0006), backend structure and conventions 3 (0007, 0013, 0014),
frontend structure and conventions 8 (0008–0012, 0021–0023), configuration,
security and operations 4 (0015, 0016, 0018, 0024), authentication 4
(0025, 0028, 0029, 0030), engineering process and documentation 5
(0017, 0019, 0020, 0026, 0027). Process and documentation is a sixth of the
corpus before this ADR, and is the category with no external limit on its
growth.

**The authentication cluster's size and reach.** 220, 156, 132 and 151 lines
for ADRs 0025, 0028, 0029 and 0030 — 659 combined, with iteration 4 task 10
still to write. Inbound references, counted by matching `ADR-00NN` across
`*.md`, `*.java`, `*.ts` and `*.tsx` excluding each ADR's own file: 8, 2, 4
and 3 respectively, 17 in total.
