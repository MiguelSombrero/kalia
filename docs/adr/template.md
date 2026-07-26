# ADR-NNNN: Title naming both the problem and the resolution

- **Status:** proposed | accepted | superseded | partially-superseded | deprecated
- **Date:** YYYY-MM-DD

Optional metadata, present only when it applies, in this order after `Date`:

- **Supersedes:** `[ADR-NNNN](NNNN-slug.md)` — what this replaced, in one line
- **Superseded-by:** `[ADR-NNNN](NNNN-slug.md)` — what replaced it, in one line
- **Amended:** YYYY-MM-DD by `[ADR-NNNN](NNNN-slug.md)` — what changed, one line

Render those three as real markdown links; they are shown as code here only so
this template contains no dangling reference of its own.

## Context

The problem and the forces acting on it: what is broken or absent, what
constrains the answer, and why the question is being asked now.

Three things do not belong here, because each has its own section below: the
verdict, the options weighed, and any measurement. If a sentence states what
was decided, it belongs in Decision. If it reports what happened when
something was run, it belongs in Evidence. If it weighs an option, it belongs
in Alternatives considered.

Target: under a minute to read. A reader who stops after this section should
understand the question but not yet the answer.

## Decision

Open with one sentence naming what was decided — a plain statement of fact or
an imperative, readable on its own without the sections around it. A reader
who jumps straight to this heading must find the decision in its first line.

Everything after that sentence bounds the decision: what it covers, what it
deliberately does not, and what rule it establishes for future work.

This is not a specification. File names, function signatures, control flow and
configuration values belong in the code itself, or — where they are the
evidence for the decision rather than a consequence of it — in Evidence. Name
a file here only when *which* file it is was itself part of the decision.

## Alternatives considered

One block per option genuinely on the table, each ending in why it was not
chosen. The rejection reasoning is the most perishable thing an ADR holds:
the code records what was built, and nothing else records what was not.

`**None.** <X> was the only realistic option because …` is a valid entry, and
a useful one — it distinguishes a decision with no alternatives from an author
who did not look. Silence does not.

## Consequences

What is now true that was not true before, in whichever mix of the three the
decision actually produced:

- Good, because …
- Bad, because …
- Neutral, because …

**At least one Bad or Neutral entry is required.** A decision with no cost is
almost always a decision whose cost has not been found yet, and this is the
section a later reader searches when the cost surfaces.

- **Revisit trigger:** the condition that should reopen this decision, when
  one is foreseeable. Optional, but cheap and repeatedly worth it.

## Evidence

Optional. Measurements, framework or library behaviour verified by running it,
and anything else that would otherwise crowd out Context.

Keep it verbatim, including the version measured against and how it was
checked. This section is why the decision can be trusted rather than merely
believed, and it is what lets a later reader tell a finding that has expired
from one that still holds.
