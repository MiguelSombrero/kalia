---
paths:
  - "backend/src/**/*.java"
  - "frontend/{app,components,features,lib,i18n,e2e}/**/*.{ts,tsx}"
  - "frontend/*.ts"
---

# Code comments carry only what the repo cannot

Binding on every comment written in the files this rule matches. Why, with the
census and measurements behind it:
[ADR-0017](../../docs/adr/0017-code-comment-policy.md). Why this file exists
rather than a paragraph in `CLAUDE.md`:
[ADR-0039](../../docs/adr/0039-mechanisms-for-recurring-rule-violations.md).

## The test

A comment earns its place only if it carries information **not present
anywhere in the repository and not derivable by reading it**:

- external framework or library behavior,
- an empirical measurement,
- a warning that a locally-correct edit is globally wrong.

Everything else is a pointer: one line naming the ADR or doc section, never a
paraphrase of it. Nothing guards a comment against the ADR it duplicates, and
a stale comment is worse than an absent one — an agent trusts what is in front
of it and never opens the ADR.

Apply the test by naming the fact. If you cannot say what a comment carries
that the repository does not, delete it.

## Let the enforcement mechanism set the weight

- Breaking the invariant **fails a test, an ArchUnit rule or the build** →
  that is the guard. Comment at most one line, and prefer pointing at the
  test.
- Breaking it fails **silently, or only in production builds** → the comment
  is mandatory, and its first sentence says "do not".

## Applied rules

- **No process narration.** No iteration or task numbers, no PR or review
  references, no "used to be" or "this was changed because". That history
  belongs in the commit message and PR description, which are built to hold
  it; a comment outlives them and becomes stale narration.
- **A decision's rationale lives in its ADR, once.** In code, name the ADR and
  state only the part a future editor of that line would get wrong without it.
  `// ADR-0016. No nonce: keeps static rendering.` — not the trade-off
  analysis.
- **Comments explaining why a test asserts something apparently pointless
  stay.** They are what stops a cleanup pass deleting a guard.
- **`package-info.java` keeps one sentence** naming the layer and its ADR.
- **Generated code is out of scope** — `frontend/lib/api/generated` is orval
  output, regenerated and never hand-edited.
