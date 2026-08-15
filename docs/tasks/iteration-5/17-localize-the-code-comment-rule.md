# Task 17: Load the code-comment rule where the code is written

- **Status:** refined
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

## Why

[ADR-0017](../../adr/0017-code-comment-policy.md) is the most frequently
violated rule in this repository. The product owner has raised over-detailed
comments in pull request review repeatedly and they keep coming back, which
makes this a systematic failure rather than a run of lapses — the same
distinction [ADR-0027](../../adr/0027-process-weight.md) drew when it refused
to leave process weight to agent judgement.

The obvious explanation is wrong, and worth writing down so it is not proposed
again. The rule is not missing from context: `CLAUDE.md` is the only document
loaded unconditionally ([ADR-0020](../../adr/0020-documentation-roles.md)) and
it carries the comment policy in full. An agent has the rule in front of it
and writes the comment anyway. What is missing is proximity and enforcement,
not presence.

Proximity is this task; enforcement is [task 18](18-check-code-comments.md).
The rule sits at line 204 of a 320-line file, as one bullet among eighteen in
`## Workflow`, tens of thousands of tokens behind the code being written by
the time it is written. Anthropic's own guidance puts the adherence cost
plainly: target under 200 lines per `CLAUDE.md`, because longer files "consume
more context and reduce adherence".

Claude Code has a mechanism aimed exactly at this, and it postdates
[ADR-0035](../../adr/0035-agent-context-layout.md)'s survey: a file in
`.claude/rules/` carrying a `paths:` frontmatter glob is loaded when Claude
reads a file matching that glob, and reloads after `/compact` the next time
one matches. That is the "state the rule where an editor meets it" property
ADR-0017 and ADR-0020 both ask for, delivered by the tool instead of by an
agent remembering.

ADR-0035 rejected `.claude/rules/`, so this task cannot simply adopt it — it
has to say why that rejection does not reach this case, or accept it.

## Scope

Move the code-comment policy out of `CLAUDE.md`'s bullet list into a
path-scoped rule file that loads when a source file is read, and record the
decision.

- `.claude/rules/code-comments.md` carries the policy's operative rules,
  scoped by `paths:` to backend and frontend source.
- `CLAUDE.md`'s code-comment bullet reduces to a pointer, so the policy still
  has exactly one home.
- A new ADR records the decision and the general test behind it, since this is
  the first rule to get this treatment and will not be the last.
- [ADR-0035](../../adr/0035-agent-context-layout.md),
  [ADR-0020](../../adr/0020-documentation-roles.md) and
  [ADR-0017](../../adr/0017-code-comment-policy.md) are amended where this
  contradicts what they currently say.

## Non-goals

- Any mechanical check of comment content — [task 18](18-check-code-comments.md).
- Changing the two-phase way an agent writes comments —
  [task 19](19-separate-implementing-from-commenting.md).
- Editing existing comments in the tree — [task 20](20-resweep-code-comments.md).
- Changing what ADR-0017 requires. This task changes **when the rule loads**,
  never what it says. A policy change would be its own ADR.
- Shrinking `CLAUDE.md` generally, or moving other rules to `.claude/rules/`.
  This is a pilot on one rule; the ADR states the test that would license the
  next one, and applying it is a separate decision.

## Constraints

- One home per fact ([ADR-0020](../../adr/0020-documentation-roles.md)). This
  is a **move**, not a copy: the operative text leaves `CLAUDE.md` in the same
  commit it arrives in `.claude/rules/`. Two copies of the comment policy is
  the exact failure ADR-0020 was written about, and it has already happened
  once — the policy existed in four places before ADR-0020's sweep.
- The rule file carries only ADR-0017's **operative** content: the
  earn-its-place test, the enforcement-weight corollary, and the applied
  rules. The census, the measurements and the rationale stay in ADR-0017,
  which the rule file links. A rule file that grows into a copy of its ADR
  reintroduces the drift surface ADR-0017 itself named "the only unguarded
  drift surface here".
- `paths:` globs name source directories explicitly rather than using
  `frontend/**`, so that `node_modules` and `frontend/lib/api/generated` are
  not matched — generated output is out of ADR-0017's scope by its own
  Decision (product-owner decision, 2026-08-15).
- [ADR-0035](../../adr/0035-agent-context-layout.md) rejected a root
  `.claude/rules/` directory on the grounds that it "moves conventions away
  from the code they govern and away from the README that already documents
  them". That reasoning is about **area conventions owned by a README**, which
  is what ADR-0035 was deciding. It does not reach the comment policy: no
  README owns it — ADR-0020 reduced both READMEs to a link and gave
  `CLAUDE.md` the full form — and it binds a file type across both subtrees
  rather than either subtree. ADR-0035 is amended to license `.claude/rules/`
  for that case, and left standing for the case it actually decided
  (product-owner decision, 2026-08-15).
- [ADR-0020](../../adr/0020-documentation-roles.md)'s carve-out lets
  `CLAUDE.md` restate a rule "an agent must have without opening a second
  file", justified by a pointer being one an agent may never follow. A
  path-scoped rule is not a pointer — nothing has to be followed, the file
  loads itself. The carve-out is amended to say so, rather than being read as
  forbidding this move (product-owner decision, 2026-08-15).
- Accepted ADRs are amended, never rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)): 0017, 0020 and
  0035 each gain an `**Amended:**` metadata line and the new text, and keep
  what they already say.
- The new ADR states the **general test**, because this is deliberately a
  pilot: a rule earns a path-scoped file when it binds a file type rather
  than a subtree, and earns a checker when a violation class is decidable
  from the comment text alone. Later rules follow the precedent instead of
  reopening it (product-owner decision, 2026-08-15).
- The ADR must record the honest limit: a path-scoped rule fires when Claude
  **reads** a matching file, so a session that writes a new source file
  without reading an existing one never loads it. That gap is what
  [task 18](18-check-code-comments.md) and
  [task 19](19-separate-implementing-from-commenting.md) cover, and it is the
  reason no single mechanism is relied on.
- `paths:` frontmatter is version-dependent Claude Code behavior, so the ADR's
  Evidence pins the version it was verified against — the discipline
  ADR-0035's own Evidence follows for the loading chain it measured
  (product-owner decision, 2026-08-15).

## Open questions

**None.**

## Acceptance criteria

- [ ] `.claude/rules/code-comments.md` exists with `paths:` frontmatter, and
      is verified to **actually load**: a `claude -p` session started at the
      repository root that reads one backend `.java` file and one frontend
      `.tsx` file reports it among its loaded memory files, and does not
      before either read — measured the way
      [ADR-0035](../../adr/0035-agent-context-layout.md)'s Evidence measured
      its own loading chain, with the Claude Code version recorded
- [ ] The rule is verified to survive `/compact`: after compaction, reading a
      matching file reloads it, and reading a non-matching file does not
- [ ] `CLAUDE.md` no longer carries the operative code-comment text, only a
      pointer to the rule file and to
      [ADR-0017](../../adr/0017-code-comment-policy.md) — grep confirms the
      policy's text appears in exactly one place in the repository outside
      ADR-0017 itself
- [ ] A new ADR records the decision, the general test, and the read-triggered
      gap, with at least one Bad or Neutral consequence; it is listed in both
      [docs/adr/README.md](../../adr/README.md) and `docs/architecture.md` §9,
      and the ADR-structure test `node scripts/check-adrs.mjs` passes
- [ ] ADR-0017, ADR-0020 and ADR-0035 each carry an `**Amended:**` line and
      the amended text rather than a rewrite; `node scripts/check-adrs.mjs`
      and `node scripts/check-tasks.mjs` are both green
- [ ] `mvn clean verify` and `npm test` are unaffected — this task touches no
      source, so a green run is the evidence that it did not

## Notes

Raised by the product owner on 2026-08-15, from the recurring pattern of
over-detailed comments in pull request review. Sibling of
[task 18](18-check-code-comments.md),
[task 19](19-separate-implementing-from-commenting.md) and
[task 20](20-resweep-code-comments.md); the four are one change split for
review, and the order matters — this one before 19, which cites the rule file.

`docs/tasks/CLAUDE.md` was considered as the location and rejected: it loads
when an agent reads a task file, which is the start of the work rather than
the moment code is written, and holding workflow rules there is the second
normative rulebook [ADR-0038](../../adr/0038-in-repo-spec-driven-process.md)
rejected `constitution.md` for being.
