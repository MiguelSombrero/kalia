# ADR-0039: A rule agents keep breaking earns a mechanism, not more prose

- **Status:** accepted
- **Date:** 2026-08-15
- **Amended:** 2026-08-30 — the edit-time hook rejected below is adopted in
  a narrower form, running the checkers rather than injecting rule text
  ([ADR-0045](0045-edit-time-checks-and-one-verify-gate.md))

## Context

[ADR-0017](0017-code-comment-policy.md) is the most frequently violated rule
in this repository. The product owner has raised over-detailed comments in
pull request review repeatedly, the rule has been restated each time, and the
comments keep coming back. A failure that survives being pointed out is
systematic rather than a run of lapses — the distinction
[ADR-0027](0027-process-weight.md) drew when it refused to leave process
weight to agent judgement.

The intuitive diagnosis is that the rule is not in front of the agent when it
writes the comment. That diagnosis is wrong, and worth recording so it is not
acted on again. `CLAUDE.md` is the only document loaded unconditionally
([ADR-0020](0020-documentation-roles.md)) and it carried the comment policy in
full. Agents had the rule in context and wrote the comment anyway.

What separates ADR-0017 from the rules that do hold is not presence. It is
that every other load-bearing rule here has something behind it. ArchUnit and
Spring Modulith guard the module boundaries, `check-adrs.mjs` the ADR index
and structure, `check-tasks.mjs` the task format and `Done when` coverage,
`permissions.deny` the generated API client, the `api-client-drift` job the
OpenAPI contract. ADR-0017 has nothing, and says so about itself: "Nothing
checks a comment against the ADR it paraphrases."

This repository has already answered the general question twice.
[ADR-0026](0026-task-file-format.md) rejected a template with no checker on
the grounds that "the ADR index drifted silently until `check-adrs.mjs`
existed", and [ADR-0038](0038-in-repo-spec-driven-process.md) states plainly
that "deterministic checks stay the enforcement mechanism". ADR-0017's own
corollary says the enforcement mechanism sets a rule's weight. The comment
policy is the case where all three were written down and none was applied.

Two things have changed since that gap was last surveyed. Claude Code gained
`.claude/rules/*.md` with `paths:` frontmatter, which loads a file when Claude
reads a source file matching a glob — a delivery mechanism that did not exist
when [ADR-0035](0035-agent-context-layout.md) rejected `.claude/rules/`. And
the drift is now measurable: ADR-0017's sweep has been undone, seven
hand-written files carry more comment lines than code where it measured none,
and 92 comments name an ADR they must move in lockstep with.

## Decision

**A rule that agents keep violating earns a mechanism rather than a firmer
restatement: its text moves to where the tool will load it, and the part of it
that is decidable from the text alone becomes a check that fails the build.**

Two tests decide which mechanism a rule earns, and they are independent:

- **A rule earns a path-scoped `.claude/rules/` file when it binds a file type
  rather than a subtree.** A rule about `frontend/` belongs in
  `frontend/README.md` and loads with that subtree, which is what ADR-0035
  decided and this does not disturb. A rule about every `.java` and `.ts` file
  in the repository has no subtree README to live in, and a `paths:` glob is
  what puts it in context at the moment such a file is opened.
- **A rule earns a checker when a violation class is decidable from the text
  alone.** Decidable classes fail the build; undecidable ones are reported,
  never failed. A rule with no decidable class gets no checker, and that is a
  finding about the rule rather than a gap in tooling.

What this covers and what it does not:

- **The rule keeps exactly one home.** Moving the comment policy out of
  `CLAUDE.md` and into `.claude/rules/code-comments.md` is a move, not a copy.
  [ADR-0020](0020-documentation-roles.md) is amended rather than contradicted:
  its `CLAUDE.md` carve-out rests on a pointer being one an agent may never
  follow, and a path-scoped rule is not a pointer — nothing has to be
  followed, the file loads itself.
- **The rule file carries operative content only.** The test, the corollary,
  the applied rules. The census, the measurements and the reasoning stay in
  the ADR, which the rule file links. A rule file that grows into a copy of
  its ADR recreates the drift surface ADR-0017 named "the only unguarded drift
  surface here".
- **No mechanism is relied on alone.** A path-scoped rule fires when Claude
  *reads* a matching file, so a session that writes a new source file without
  reading an existing one never loads it. That gap is why the checker exists
  and why the implementation procedure gets an explicit comment pass, rather
  than something to be argued away.
- **This ADR decides the general rule and applies it to ADR-0017 only.**
  Applying it to a second rule is a separate decision, made against the two
  tests above rather than by analogy.
- **Not decided here:** what the comment policy says. ADR-0017 owns that, and
  this ADR changes only when it loads and what guards it.

## Alternatives considered

**Restate the rule more firmly in `CLAUDE.md`.** The cheapest option and the
one already tried, repeatedly, by every review comment that raised the issue.
Rejected on its own record: the rule was present in full, in the one document
that is always loaded, and was violated anyway. There is no version of "state
it again, but emphatically" that has not already been run as an experiment
here.

**A `CLAUDE.md` in `docs/tasks/`, holding a numbered implementation
procedure.** The product owner's original proposal, and the source of the
comment-pass idea this repository adopts. Rejected as a *location* on two
counts. It loads when an agent reads a task file, which is the start of the
work rather than the moment code is written — no closer to the comment than
root `CLAUDE.md` already was. And a per-directory `CLAUDE.md` holding rules
rather than a pointer is what [ADR-0035](0035-agent-context-layout.md)
decided against, and a second normative rulebook is what
[ADR-0038](0038-in-repo-spec-driven-process.md) rejected `constitution.md`
for being. The sequencing half of the proposal is adopted, as a skill.

**Duplicate the rule into both `CLAUDE.md` and `.claude/rules/`.** Removes the
read-triggered gap entirely, since `CLAUDE.md` is always loaded. Rejected
because it is the exact failure [ADR-0020](0020-documentation-roles.md) was
written to stop, and the code-comment policy is the case that ADR cites: it
existed in four places before ADR-0020's sweep, and two of the copies had
already drifted. Buying gap coverage with a second copy trades a rare failure
for a certain one.

**A `PreToolUse` hook injecting the rule before every `Edit` or `Write`.**
Genuinely deterministic, where a path-scoped rule is read-triggered and a
skill is model-triggered — it fires on the tool call regardless of what the
model decides. Rejected for now on cost against benefit: it runs a shell
command on every edit in every session, it must be trusted per machine before
it runs at all, and hook-injected text reaches the model as context with no
more binding force than the rule file has. It buys closing of the
read-triggered gap and nothing else, and the checker already closes that gap
at the point it matters, which is before the code merges. Worth reopening if
the checker shows violations still reaching CI.

**Lint rules instead of a bespoke checker** — Checkstyle or PMD for Java, an
ESLint rule for TypeScript. Rejected because the policy is not a formatting
rule: no off-the-shelf rule expresses "carries information not present
anywhere in the repository", the two toolchains would need the rule written
and maintained twice in two plugin dialects, and the checkers this repository
already trusts are two dependency-free Node scripts that run in CI without an
install. A third sibling costs less than a plugin in each toolchain.

## Consequences

- Good, because the comment policy is now in context at the moment a source
  file is open, without a session spending a read on it or remembering to —
  and it returns after `/compact` on the next matching read, which is measured
  in Evidence rather than assumed.
- Good, because the repository's own stated position — that the enforcement
  mechanism sets a rule's weight — now applies to the rule that stated it.
- Good, because the code-comment bullet in `CLAUDE.md`'s `## Workflow` — the
  section most competing for attention — drops from seventeen lines to six.
  The file itself goes from 320 lines to 313, the difference being the four
  lines `## Repository layout` gains to describe `.claude/rules/`. Against a
  documented guideline of 200 lines, that is a dent rather than a fix.
- Bad, because the rule is no longer unconditionally loaded. A session that
  creates a new source file without reading an existing one never sees it, and
  a session doing pure documentation work does not either. This is the cost of
  the move, it is real, and the checker rather than a second copy is what
  covers it.
- Bad, because `.claude/rules/` is a fourth place an instruction can live,
  after `CLAUDE.md`, the per-directory pointers and the READMEs. The two tests
  in Decision are what stop it becoming a general-purpose home; nothing
  mechanical enforces them, exactly as nothing mechanically enforces
  ADR-0020's one-home rule.
- Bad, because `paths:` glob matching cannot express an exclusion. The
  frontend glob matches `frontend/lib/api/generated/`, which ADR-0017 places
  out of scope. The over-match is harmless — the rule an agent loads there
  says generated code is exempt, and `permissions.deny` already blocks editing
  it — but the alternative was enumerating `lib/`'s subdirectories, which
  would silently miss a new one. An over-match that is visible was preferred
  to an under-match that is not.
- Neutral, because this changes nothing about what a good comment is.
  ADR-0017's test, corollary and applied rules are unchanged; only their
  delivery and their guard are new.
- **Revisit trigger:** if violations still reach CI after the checker lands,
  the read-triggered gap is the likely cause and the `PreToolUse` hook
  rejected above becomes the next thing to try. If instead the checker fires
  mostly on comments that turn out to be correct, the decidability test in
  Decision is wrong and the failing classes should become advisory.

> **Amended 2026-08-30.** The hook is adopted, in a narrower form than the one
> rejected here, and not because this trigger fired.
> [ADR-0045](0045-edit-time-checks-and-one-verify-gate.md) runs the *checkers*
> on `PostToolUse` and reports their output; it does not inject rule text,
> which is what the cost-against-benefit rejection above was weighed against.
> Two of that rejection's premises survive unchanged — a hook is still trusted
> per machine, and hook-injected prose would still carry no more force than
> the rule file. The third does not: "it runs a shell command on every edit"
> was estimated, and the measurement is about 40 ms per edit. Nothing here
> changes what ADR-0017 asks of a comment, or the two tests in Decision above
> that decide which mechanism a rule earns.

## Evidence

Measured on 2026-08-15 at **Claude Code 2.1.220**, by `claude -p` sessions
started at the repository root. `paths:` matching is version-dependent
behavior, which is why the version is pinned here rather than described.

**Loading.** With no source file read, the session reported only root
`CLAUDE.md` and the auto-memory index. After reading one `.java` file and one
`.tsx` file it reported `.claude/rules/code-comments.md` alongside
`backend/CLAUDE.md`, `backend/README.md`, `frontend/CLAUDE.md`,
`frontend/AGENTS.md` and `frontend/README.md`.

Each glob was then triggered in isolation, one read per session:

| Read | Rule loaded |
|---|---|
| `backend/src/main/java/fi/kalia/catalog/CatalogApi.java` | yes |
| `frontend/features/catalog/Pagination.tsx` | yes |
| `frontend/lib/api/mutator.ts` | yes |
| `frontend/app/[locale]/page.tsx` | yes |
| `frontend/app/api/auth/[...nextauth]/route.ts` | yes |
| `frontend/lib/api/generated/models/` | yes — the over-match above |
| `docs/roadmap.md` | no |

The two bracketed paths were checked specifically: glob syntax treats `[` as
the start of a bracket expression, and this project's entire App Router lives
under `frontend/app/[locale]/`. Matching works, so no escaping is needed.

**Negation is not supported.** A `"!frontend/lib/api/generated/**"` entry was
added and changed nothing — the generated directory still matched, and the
normal case still matched. The pattern is accepted and matches no files rather
than excluding any, which is why the over-match above is accepted instead.

**Compaction**, on one session pinned with `--session-id` so that continuity
could be proven rather than assumed. Before compaction the rule was loaded.
`/compact` was run in that session; continuity was confirmed by the session
still naming the file read before it. Immediately after compaction and before
any new read, the rule was **not** loaded while root `CLAUDE.md` still was —
the contrast [ADR-0035](0035-agent-context-layout.md) records for nested
`CLAUDE.md` files. Reading a non-matching file afterwards did **not** bring it back; reading one
matching file did.

**Coverage.** Every directory holding a hand-written `.ts`/`.tsx` file outside
`node_modules` was enumerated and checked against the globs: `frontend`
itself, `app` (including both bracketed route segments), `components/ui`,
`e2e`, `features/{auth,catalog,i18n}`, `i18n`, `lib`, `lib/api`, `lib/auth`,
`lib/config`. All are matched. The eight top-level `frontend/*.ts` files are
matched by their own entry, `frontend/**` having been rejected because it
would match `node_modules`.
