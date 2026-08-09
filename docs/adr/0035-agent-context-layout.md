# ADR-0035: Per-directory CLAUDE.md files are pointers to their README, not copies of it

- **Status:** accepted
- **Date:** 2026-08-09

## Context

`backend/README.md` and `frontend/README.md` hold the conventions binding on
every change in their subtree — arrow functions only, logging through
`lib/logger.ts`, the generated API client never imported outside a feature, the
`*Test`/`*IT` split. Root `CLAUDE.md` links both and asks that they be read
before making changes, but nothing makes that happen: `CLAUDE.md` is the only
document loaded unconditionally ([ADR-0020](0020-documentation-roles.md)), and
a link inside it is one an agent may or may not follow. A session that skips
the read works without the conventions and finds out at review.

Claude Code has a mechanism for exactly this. A `CLAUDE.md` in a subdirectory
loads on its own when Claude reads a file there, and `@path` imports inside it
are expanded when it loads. `frontend/` already had such a file — one line,
`@AGENTS.md`, written by `create-next-app` and never a decision anyone made.
`backend/` had none.

Anthropic's [large-codebase guide](https://code.claude.com/docs/en/large-codebases)
packages this with seven other monorepo optimizations, most of which answer
context pressure that a repository of this size does not have. Which of them
apply here, and on what grounds the rest are declined, was unwritten — so each
session that meets the guide re-decides it.

## Decision

**A per-directory `CLAUDE.md` is a pointer: it imports that directory's README
and adds nothing the README already says.**

`backend/CLAUDE.md` imports `backend/README.md`. `frontend/CLAUDE.md` imports
`frontend/README.md` and `frontend/AGENTS.md`. Neither restates a convention.
The README remains the single home for *how* rules, per
[ADR-0020](0020-documentation-roles.md); the pointer file only changes when the
conventions load, never what they say. A convention that belongs to one subtree
is added to that README, not to the pointer and not to root `CLAUDE.md`.

One rule is exempt and is repeated in root `CLAUDE.md`: that this Next.js
version postdates model training and its bundled docs must be checked before
relying on memory. A nested file is not re-injected after `/compact` and root
`CLAUDE.md` is, and the rule's violation fails silently — the class
[ADR-0017](0017-code-comment-policy.md) requires be stated wherever an editor
meets it. Any future rule meeting both tests earns the same duplication; none
does today.

Two further settings from the guide are adopted, both for correctness rather
than context cost: `.claude/settings.json` denies `Edit` on
`frontend/lib/api/generated/**`, making [ADR-0012](0012-orval-api-client.md)'s
generated-output rule enforced rather than merely written; and
`.claude/worktrees/` is gitignored, since that is where agent worktrees
actually live.

Everything else in the guide is declined — see Alternatives considered. That
list is the decision's real content: it is what stops the next session
re-opening the question.

## Alternatives considered

**Duplicate the conventions into the per-directory files.** The obvious
reading of the guide, whose examples write conventions directly into each
package's `CLAUDE.md`. Rejected because it creates a second home for every rule
and no mechanism keeps the two in step; the README would rot first, being the
one a human opens.

**Path-scoped rules in a root `.claude/rules/` directory instead.** Equivalent
loading behaviour, with all rules in one place and glob patterns that can span
scattered paths. Rejected because it moves conventions away from the code they
govern and away from the README that already documents them, which is the
opposite of what this repository does with every other documented fact. The
glob-spanning advantage is worth nothing across two subtrees.

**`claudeMdExcludes`.** Rejected: there are two subtrees and both are relevant
to nearly every task. The setting solves other teams' packages, which do not
exist here.

**`worktree.sparsePaths`.** Rejected on repository size (see Evidence). Sparse
checkout would omit a few megabytes, and most tasks touch both apps anyway
because the frontend's API client is generated from the backend's OpenAPI
document.

**`worktree.symlinkDirectories` for `node_modules`.** The one setting with a
measurable saving (see Evidence). Rejected on correctness: worktrees exist to
isolate concurrent branches, and a branch that changes `package.json` would
install into the tree every other worktree is reading. The disk cost is also
misattributed — it comes from worktrees outliving their merged PRs, which is a
cleanup rule `CLAUDE.md` already states, not a configuration gap.

**`permissions.additionalDirectories` / `--add-dir`.** Rejected: sessions start
at the repository root, so every path is already reachable.

**Per-directory skills under `backend/.claude/skills/`.** Rejected for now:
the only skill this repository has, `quality-sweep`, is deliberately
whole-codebase. Nothing area-specific exists to package. This is the least
settled of the rejections — a backend-only or frontend-only procedure would
reopen it.

**Code-intelligence (LSP) plugins.** Rejected as a committed setting: they are
a per-developer install requiring language-server binaries on each machine, and
the file counts here are small enough that grep is not the bottleneck. Nothing
prevents an individual installing one.

**Plugins in an internal marketplace, an MCP code-search server, a
`SessionStart` hook recommending per-area plugins.** Rejected as org-scale
mechanisms: all three coordinate many teams across many repositories, and this
is one repository with one product owner.

**`.worktreeinclude`.** Rejected because it copies gitignored files into new
worktrees and there are none to copy — every environment-varying value has a
safe default in `application.properties` or compose
([ADR-0015](0015-configuration-strategy.md)).

## Consequences

- Good, because the conventions that govern a change are in context by the time
  the change is written, without a session spending a read on them or
  remembering to.
- Good, because a rule about `frontend/` now has exactly one place it can be
  written — that README — and the pointer file gives no room to write it
  anywhere else.
- Good, because the generated API client is protected by the tool rather than
  by an agent recalling ADR-0012.
- Bad, because a nested `CLAUDE.md` is not re-injected after `/compact`, so the
  conventions silently leave context in a long session and return only on the
  next read in that subtree. Root `CLAUDE.md` does not have this problem, which
  is why the one silently-failing rule is duplicated there.
- Bad, because the deny rule's path is relative to where a session starts, so
  it protects the generated client only for sessions started at the repository
  root. That is how every session here starts, and it is the same assumption
  the `additionalDirectories` rejection above rests on, but nothing enforces
  it — a session started inside `frontend/` is silently unprotected.
- Bad, because importing a whole README is all-or-nothing: touching one
  frontend file loads all 14 KB, including auth conventions irrelevant to a
  Tailwind change. Splitting the READMEs to load less would cost the property
  that makes this work — one home per rule.
- Neutral, because every rejection above is grounded in this repository's
  current size and shape rather than in the mechanisms being unsound.
- **Revisit trigger:** a third top-level application, or a README growing past
  the point where loading all of it on any file read is the cheaper option.

## Evidence

Repository measured 2026-08-09, at Claude Code 2.1.202:

| | |
|---|---:|
| Tracked files | 271 |
| Tracked lines, all file types | ~30,000 |
| Backend Java files | 60 |
| Frontend `.ts`/`.tsx` files | 96 |
| Root `CLAUDE.md` | 306 lines / 18 KB |
| `frontend/README.md` | 231 lines / 14 KB |
| `backend/README.md` | 238 lines / 13 KB |

This is the basis for rejecting the context-pressure settings: the guide
addresses repositories where instructions and file reads unrelated to a task
fill the context window, and at 271 files nothing does.

`node_modules` duplication across worktrees, same date: 2.0 GB total under
`.claude/worktrees/`, of which three worktrees held a `node_modules` of
640–657 MB each. All three belonged to merged or abandoned branches, which is
what `symlinkDirectories` would have optimized rather than removed.

The deny rule was verified in a running session on 2026-08-09: `Edit` and
`Write` against `frontend/lib/api/generated/models/` were both refused, and
`Read` of the same file still succeeded. One `Edit(...)` entry therefore covers
the whole write family — a second `Write(...)` entry is not needed.

The loading chain was verified the same day, at Claude Code 2.1.202, by
`claude -p` sessions started at the repository root: after reading one file
under `frontend/`, the session reported `frontend/CLAUDE.md`,
`frontend/AGENTS.md` and `frontend/README.md` loaded, and answered a
conventions question from them without a further read. The `backend/` chain
behaved identically.

`frontend/AGENTS.md` is kept rather than folded into the README on the strength
of a concrete catch: it is what led an agent to Next.js 16's bundled docs and
to `proxy.ts`, which replaced `middleware.ts` in a version later than the
model's training data. It is also the filename other coding agents read;
Claude Code reads only `CLAUDE.md`, which is why the import exists.
