# CLAUDE.md

Instructions for AI agents working in this repository. It is the only document
loaded unconditionally, so every line costs context in every session: **keep it
under 200 lines**
([ADR-0048](docs/adr/0048-what-survives-a-claude-md-bullet.md), amended by
[ADR-0085](docs/adr/0085-three-gates-live-in-the-skill-that-runs-them.md)).

## Goals — read first

This project is **process-first**. It exists as much to practice disciplined
AI-assisted development as to build the app. Two goals rank above speed of
delivery:

1. **Documentation and implementation never drift apart.** The docs in
   `docs/` are the source of truth for design intent; code that contradicts
   them is a bug in one or the other — resolve it in the same PR.
2. **Professional quality bar.** Architecture, code, tests, and commits are
   held to production-grade standards even though this is not a production
   app. Between a shortcut and the practice a senior team would follow, follow
   the practice — or write an ADR explaining the deliberate exception.

If a request conflicts with these goals, say so before proceeding.

**Roles:** MiguelSombrero is the product owner — sets vision and goals, owns
every architecture and design decision, reviews code and merges PRs; does not
code. AI agents produce all documentation and code, acting as scrum master,
architect, developer and reviewer, and advise on architecture without deciding
it ([README.md](README.md)).

## Project

Kalia is a social platform for beer enthusiasts built around the beer cellar:
Next.js frontend (BFF pattern) + Spring Boot modulith backend. The catalog
enables the cellar, the cellar is the product, and a profile and activity feed
make it social. Kalia never collects beer reviews and does not sell beer. Read
before making changes:

- [docs/architecture.md](docs/architecture.md) — module boundaries, API
  conventions, persistence rules, testing strategy
- [docs/roadmap.md](docs/roadmap.md) — iteration index and status; tasks live
  under [docs/tasks/](docs/tasks/), one file per task from iteration 5 on,
  written to [its template](docs/tasks/template.md) before work starts
- [docs/adr/](docs/adr/) — decisions already made, grouped by subject in
  [its README](docs/adr/README.md); don't relitigate them silently, propose a
  new ADR instead ([template](docs/adr/template.md))
- [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md)
  — run/test commands and conventions

`backend/` and `frontend/` each carry a `CLAUDE.md` importing their README, which
loads once you touch the subtree
([ADR-0035](docs/adr/0035-agent-context-layout.md)). A nested file is *not*
re-injected after `/compact`, so the one rule that must never be lost is
repeated here: **this Next.js version postdates model training — check
`frontend/node_modules/next/dist/docs/` before relying on memory about it.**
Guessing fails silently rather than erroring (`middleware.ts` is `proxy.ts`
here, and the app still builds).

The repository tree is in [README.md](README.md); `.claude/settings.json` marks
the generated API client read-only ([ADR-0012](docs/adr/0012-orval-api-client.md)).

## Commands

**`make verify` is the gate** — every check CI runs, in CI's order. `make
verify-fast` is the ~10 s subset needing neither Docker nor a build, and is
what the `pre-push` hook from `make install-hooks` runs. One of them goes
green before every push
([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)); `make
next-adr` allocates the next ADR number. Run one suite from the repository root
in a subshell — `(cd backend && mvn test)` — since a bare `cd` persists and
breaks the next command; each README lists its suites.

## Workflow

Five skills under `.claude/skills/` are the entry points, each ordering gates
into a numbered procedure without changing one: `implement-task` (a `refined`
task, to pull request), `design-task`, `refine-task`, `refine-iteration` and
`worktree`.

The gates themselves:

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Match process weight to the task — implement directly by default**
  ([ADR-0027](docs/adr/0027-process-weight.md)); skip the implementation plan,
  never the task file ([ADR-0026](docs/adr/0026-task-file-format.md)). Reach
  past that only for the two conditions ADR-0027 names.
- **Never start a task that is not `refined`**, and **only the product owner
  moves it there** — never an agent on its own behalf. **Refine in one PR,
  implement in another** ([ADR-0026](docs/adr/0026-task-file-format.md)).
- **Never commit directly to `dev`.** Every task gets a feature branch off
  up-to-date `dev` (naming: `iteration-N/<topic>`, `docs/<topic>`,
  `fix/<topic>`) and is merged back via pull request.
- **Never commit, push or upload a screenshot or screen capture** — of the app,
  the browser pane or any other screen. Keep it in the scratchpad and describe
  what you saw in words; `make verify` fails on any tracked raster image
  ([rule](.claude/rules/no-screenshots.md)).
- **Parallel sessions: one git worktree each, never a shared checkout** — two
  sessions running `git` against one working directory race on its single
  `HEAD`/index. The `worktree` skill covers setup and teardown.
- **Checkpoint before long or fanned-out work.** On "resume where you left
  off", read the gitignored `.claude/session-checkpoint.md` before
  re-exploring; it is the only thing that survives a session-limit
  interruption ([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
- Test-first: write or update tests with the code; `make verify` green before
  a PR. Verify changes by actually running them, not just by compiling.
- **Open the PR automatically once a task is done** — don't wait to be asked.
  "Done" means every gate here is met; merging stays the product owner's
  explicit action. Follow [the template](docs/PULL_REQUEST_TEMPLATE.md).
- **Doc-sync, code-review and iteration-DoD gates, and ticking acceptance
  criteria:** `implement-task` states them in full — invoke it for any task
  ([ADR-0085](docs/adr/0085-three-gates-live-in-the-skill-that-runs-them.md)).
  In short: update the docs the change touches, run `/code-review`, verify each
  criterion by running its check, never close an iteration on its last tick.
- **Reach for other skills only when this task needs them** — weighed against
  the process-weight rule above. Don't hardcode plugin names as required steps;
  most are not bundled.
- **Code review is a dialogue.** Analyse every review comment critically before
  acting. Agreeing: implement and reply with what changed. Disagreeing: reply
  in the thread with the concern and a concrete alternative, and make **no
  code changes** until the discussion settles; if the product owner's decision
  stands, implement it. Conventions that emerge get documented in the same PR.
- Commit messages: imperative summary line, body explains what and why,
  reference the roadmap task.
- **Code comments carry only what the repo cannot** —
  [`.claude/rules/code-comments.md`](.claude/rules/code-comments.md) loads
  itself when you read a source file
  ([ADR-0017](docs/adr/0017-code-comment-policy.md)).
- **ADRs follow [the template](docs/adr/template.md)** — Decision opens with one
  self-contained verdict sentence, at least one Bad or Neutral consequence, and
  an accepted ADR is amended rather than rewritten
  ([ADR-0019](docs/adr/0019-adr-format-and-conventions.md)).
- **A decision earns an ADR only when all three hold:** a credible alternative
  was rejected and the reason would not survive in the code,
  `docs/architecture.md` or a README; it binds work now (a carried possibility
  is a backlog item); and a different task or module will need its reasoning
  later — otherwise the task file's Constraints or Notes is the home. Decisions
  on one subject stay separate documents ([ADR-0032](docs/adr/0032-when-a-decision-earns-an-adr.md)).
- **Each documented fact has one home** — ADRs record *why*,
  `docs/architecture.md` *shape*, READMEs *how*; every other mention is a
  one-line pointer ([ADR-0020](docs/adr/0020-documentation-roles.md)). Two
  exceptions: this file may restate anything that applies to every edit, and
  **a rule whose violation fails silently keeps its warning inline wherever an
  editor meets it** — compressing that class of rule into a link is a
  regression dressed as tidying.
- **New dependencies: ask, don't research.** When a task introduces one
  (library, starter, plugin, Docker image, GitHub Action), list them and ask
  which versions to use — one batched question per task. Exceptions: versions
  already pinned in a manifest (`backend/pom.xml`, `frontend/package.json`,
  `docker-compose.yml`, a `Dockerfile`, a workflow) or here, and versions
  confirmed from authoritative output (build errors, repository metadata,
  generator output); propose those for confirmation. **The version is recorded
  in that manifest and nowhere else** — the README tech stack inventory names
  the technology without its number
  ([ADR-0020](docs/adr/0020-documentation-roles.md)).
- **A CI vulnerability-scan failure unrelated to your diff is still your
  problem** — fix it in place as its own commit on the open branch, never a
  second PR ([ADR-0024](docs/adr/0024-dependency-vulnerability-scanning.md)).
  No asking first *only* while the fix stays inside the vulnerable package's
  declared semver range (a lockfile-only bump); crossing it, or bumping a
  *direct* dependency past its pin, is a version choice under "new
  dependencies". Confirm the finding clears by reproducing CI's exact Trivy
  invocation (`frontend/README.md`, `backend/README.md`) before pushing.
- **An unexpected failure gets one appended row in
  [docs/common-failures.md](docs/common-failures.md)**, on the branch it
  happened on ([ADR-0084](docs/adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)).
- **A CI check you have seen fail before is probably in
  [docs/ci-playbook.md](docs/ci-playbook.md)**; add an entry when a failure
  costs real time to *recognise*, naming the run.

## Quality checks

The `/quality-sweep` skill runs a periodic whole-codebase audit of the product
and of this repository's own process; its mechanics live in the skill and in
[the quality backlog](docs/tasks/quality-backlog.md)'s header. It is
**product-owner-initiated only, and this part cannot move into the skill:** it
sets `disable-model-invocation`, so it is absent from an agent's skill list and
cannot announce itself. Proactively *suggest* it at the start of a new
iteration's first task; never trigger it or lift a finding into an iteration
yourself. **Not adopted:** a subagent review on every task before every PR —
the sweep's five dimensions need whole-codebase context, and `/code-review` is
a single reviewer that stays a gate
([ADR-0027](docs/adr/0027-process-weight.md)); and per-task process
retrospection, the sweep's `process-quality` dimension
([ADR-0051](docs/adr/0051-process-retrospection-belongs-to-the-sweep.md)).

## Environment notes

- Each worktree's `docker compose` project is isolated, but the host ports are
  fixed — two worktrees collide if both bring up the full stack, so run it in
  one at a time.
- Docker Desktop may need starting: `open -a Docker`, then wait for `docker info`.
