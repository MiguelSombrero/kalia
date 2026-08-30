# CLAUDE.md

Instructions for AI agents working in this repository. It is the only document
loaded unconditionally, so every line costs context in every session: **keep it
under 200 lines**, and see
[ADR-0048](docs/adr/0048-what-survives-a-claude-md-bullet.md) for what a bullet
is allowed to hold.

## Goals — read first

This project is **process-first**. It exists as much to practice disciplined
AI-assisted development as to build the app. Two goals rank above speed of
delivery:

1. **Documentation and implementation never drift apart.** The docs in
   `docs/` are the source of truth for design intent. Code that contradicts
   them is a bug in one or the other — resolve it in the same PR, never leave
   it.
2. **Professional quality bar.** Architecture, code, tests, and commits are
   held to production-grade standards even though this is not a production
   app. When choosing between a shortcut and the practice a senior team would
   follow, follow the practice — or write an ADR explaining the deliberate
   exception.

If a request conflicts with these goals, say so before proceeding.

**Roles:** MiguelSombrero is the product owner — sets vision and goals, owns
every architecture and design decision, reviews code and merges PRs; does not
code. AI agents produce all documentation and code, acting as scrum master,
architect, developer and reviewer. An agent advises on architecture and lays
out trade-offs; it does not decide. Full descriptions:
[README.md](README.md).

## Project

Kalia is a social platform for beer enthusiasts built around the beer cellar:
Next.js frontend (BFF pattern) + Spring Boot modulith backend. The catalog
enables the cellar, the cellar is the product, and a profile and activity feed
make it social. Kalia never collects beer reviews and does not sell beer. Read
before making changes:

- [docs/architecture.md](docs/architecture.md) — module boundaries, API
  conventions, persistence rules, testing strategy
- [docs/roadmap.md](docs/roadmap.md) — iteration index and status; the
  per-iteration tasks, the backlog and the quality backlog live under
  [docs/tasks/](docs/tasks/), one file per task from iteration 5 on, written
  to [its template](docs/tasks/template.md) before work starts
- [docs/adr/](docs/adr/) — decisions already made, grouped by subject in
  [its README](docs/adr/README.md); don't relitigate them silently, propose a
  new ADR instead ([template](docs/adr/template.md))
- [backend/README.md](backend/README.md) — run/test commands, Lombok/
  JSpecify/ArchUnit conventions, testing naming (`*Test`/`*IT`)
- [frontend/README.md](frontend/README.md) — run/test commands,
  feature-package conventions, TanStack Query/Zustand/i18next usage

Both READMEs load on their own once you touch their subtree — `backend/`
and `frontend/` each carry a `CLAUDE.md` that imports theirs
([ADR-0035](docs/adr/0035-agent-context-layout.md)). A nested file is *not*
re-injected after `/compact`, so the one rule that must never be lost is
repeated here: **this Next.js version postdates model training — check
`frontend/node_modules/next/dist/docs/` before relying on memory about it.**
Guessing fails silently rather than erroring (`middleware.ts` is `proxy.ts`
here, and the app still builds).

The rest of the tree:

- `backend/` Spring Boot modulith (Java, Maven) · `frontend/` Next.js
  (TypeScript, plus `AGENTS.md`) · `docs/` architecture, roadmap, tasks, ADRs,
  and `ci-playbook.md` (a red CI job → the document that explains the fix)
- `docker-compose.yml` — full local stack (PostgreSQL, backend, frontend,
  Keycloak, Valkey); frontend `:3000` and backend `:8080` published,
  localhost-only
- `.github/` — `workflows/ci.yml` builds and tests both apps on every push and
  scans for CVEs ([ADR-0024](docs/adr/0024-dependency-vulnerability-scanning.md));
  `dependabot.yml` opens weekly update PRs
- `Makefile` — the `verify` gate and the local-dev shortcuts (`make help`)
- `scripts/` — the dependency-free Node checkers CI runs, `next-adr.mjs`, and
  `hooks/` (`post-edit-check.mjs`, wired up by `.claude/settings.json`;
  `pre-push`, installed by `make install-hooks`)
- `.claude/` — `skills/` (the four entry points below, plus `quality-sweep`),
  `rules/` (scoped to a file type by a `paths:` glob, loaded when a matching
  file is read rather than every session), and `settings.json` (generated API
  client read-only, [ADR-0012](docs/adr/0012-orval-api-client.md); the
  `PostToolUse` checker hook,
  [ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
  `settings.local.json` beside it is per-machine and gitignored

## Commands

**`make verify` is the gate** — every check CI runs, in CI's order. `make
verify-fast` is the ~10 s subset needing neither Docker nor a build, and is
what the `pre-push` hook from `make install-hooks` runs. One of them goes
green before every push
([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)). `make
help` lists the rest; `make next-adr` allocates the next ADR number.

To run one suite on its own, from the repository root — the parentheses
matter, a bare `cd` persists into the next command and breaks the one after
it:

```bash
(cd backend  && mvn test)          # unit tests (*Test) — fast, no Docker
(cd backend  && mvn verify)        # + integration tests (*IT) — needs Docker
(cd frontend && npm test)          # vitest
(cd frontend && npm run test:e2e)  # playwright — needs the stack up
node scripts/check-adrs.mjs        # ADR ↔ architecture.md §9 + adr/README.md
node scripts/check-tasks.mjs       # task files ↔ iteration index
node scripts/check-comments.mjs    # code-comment policy (ADR-0017)
```

## Workflow

Four skills under `.claude/skills/` are the entry points. Each orders gates
stated below into a numbered procedure; none of them changes a gate.

- **`implement-task`** — implementing a `refined` task, from reading the task
  file to opening the pull request.
- **`refine-task`** — taking one `needs-refinement` task to `refined`.
- **`refine-iteration`** — when more than one task in an iteration needs it;
  refinement's unit is the iteration
  ([ADR-0047](docs/adr/0047-refinement-is-batched-per-iteration.md)).
- **`worktree`** — cutting a task worktree off a freshly fetched `origin/dev`,
  and removing it once its PR merges.

The gates themselves:

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Match process weight to the task — implement directly by default**
  ([ADR-0027](docs/adr/0027-process-weight.md)). Reach past that only for the
  two conditions that ADR names: a design-exploration skill for a genuinely
  new subsystem whose design is still open, and subagent-driven execution only
  when a change would overflow one context. Skip the implementation plan;
  never skip the task file ([ADR-0026](docs/adr/0026-task-file-format.md)).
- **Never start a task that is not `refined`**, and **only the product owner
  moves it there** — never an agent on its own behalf
  ([ADR-0026](docs/adr/0026-task-file-format.md)).
- **Refine in one PR, implement in another**
  ([ADR-0026](docs/adr/0026-task-file-format.md)).
- **Never commit directly to `dev`.** Every task gets a feature branch off
  up-to-date `dev` (naming: `iteration-N/<topic>`, `docs/<topic>`,
  `fix/<topic>`) and is merged back via pull request.
- **Parallel sessions: one git worktree each, never a shared checkout.** Two
  sessions running `git` against one working directory race on its single
  `HEAD`/index, and a `checkout` interleaving with a `commit` misattributes
  the commit to the wrong branch. The `worktree` skill covers setup and
  teardown, including what Claude Code's own sweep will not clean up.
- **Checkpoint before long or fanned-out work.**
  `.claude/session-checkpoint.md` is gitignored and is the only thing that
  survives a session-limit interruption: on "resume where you left off", read
  it before re-exploring
  ([ADR-0046](docs/adr/0046-edit-time-checks-and-one-verify-gate.md)).
- Test-first: write or update tests with the code; `make verify` green before
  a PR. Verify changes by actually running them, not just by compiling.
- **Open the PR automatically once a task is done** — don't wait for an
  explicit instruction. "Done" means every gate here is met, so the PR does
  not open until they are. The PR is the review gate, not its creation:
  opening one merges nothing, and merging stays the product owner's explicit
  action on GitHub. Follow
  [the template](docs/PULL_REQUEST_TEMPLATE.md).
- **Doc-sync gate:** before opening a PR, re-read the sections of
  `docs/architecture.md`, the iteration index and any ADRs the change touches,
  and update them in the same PR — or state in the description that they were
  checked and remain accurate. The task file is the exception: it records what
  was *asked for*, so it is frozen at completion apart from its status.
- **Code-review gate:** run `/code-review` on the diff — local, in-session, no
  separate service — and mark each finding worth acting on **fix now** or
  **new task**.
- **Reach for other skills when they'd genuinely help** — architecture review,
  design critique, accessibility audits — weighed against the process-weight
  rule above: "genuinely help" means this task needs it, not that the skill
  looks thorough. Skills self-trigger on their own description; don't hardcode
  plugin names as required steps, since most are not bundled and may be absent
  for a future session or contributor.
- **Verify each acceptance criterion by running what it says verifies it**,
  then tick it and set the status to `done` in both the task file and its
  iteration index, in the PR that completes it. A criterion you cannot
  honestly tick means the task isn't done. (Iterations 0–4 predate task files:
  tick in `docs/tasks/iteration-N.md`.)
- **Iteration DoD gate:** never declare an iteration complete because its last
  task is ticked. Re-read its "Done when" and verify each criterion by running
  it; if any is unmet, add tasks to close the gap. The same coverage check
  applies when planning an iteration
  ([ADR-0026](docs/adr/0026-task-file-format.md)). Update that iteration's
  Status in `docs/roadmap.md` once it is genuinely done.
- **Code review is a dialogue.** Analyse every review comment critically —
  architecture, security, code quality, API design, testability — before
  acting. Agreeing: implement and reply with what changed. Disagreeing: reply
  in the thread with the concern and a concrete alternative, and make **no
  code changes** until the discussion settles. If the product owner's decision
  stands after discussion, implement it. Conventions that emerge from review
  get documented in the same PR.
- Commit messages: imperative summary line, body explains what and why,
  reference the roadmap task.
- **Code comments carry only what the repo cannot** —
  [`.claude/rules/code-comments.md`](.claude/rules/code-comments.md) loads
  itself when you read a source file, so it is not repeated here
  ([ADR-0039](docs/adr/0039-mechanisms-for-recurring-rule-violations.md),
  [ADR-0017](docs/adr/0017-code-comment-policy.md)).
- **ADRs follow [the template](docs/adr/template.md)** — five sections,
  Decision opening with one self-contained sentence naming the verdict, at
  least one Bad or Neutral consequence, and an accepted ADR amended rather
  than rewritten ([ADR-0019](docs/adr/0019-adr-format-and-conventions.md)).
- **A decision earns an ADR when a credible alternative was rejected and the
  reason would not survive in the code, `docs/architecture.md` or a README**,
  and decisions on one subject stay separate documents
  ([ADR-0032](docs/adr/0032-when-a-decision-earns-an-adr.md)).
- **Each documented fact has one home** — ADRs record *why*,
  `docs/architecture.md` *shape*, READMEs *how*; every other mention is a
  one-line pointer with a link
  ([ADR-0020](docs/adr/0020-documentation-roles.md)). Two exceptions: this
  file may restate anything that applies to every edit, since a pointer here
  is one an agent never follows; and **a rule whose violation fails silently
  keeps its warning inline wherever an editor meets it** — compressing that
  class of rule into a link is a regression dressed as tidying.
- **New dependencies: ask, don't research.** When a task introduces one
  (library, starter, plugin, Docker image, GitHub Action), list them and ask
  which versions to use — batched in one question per task — rather than
  hunting registries. Exceptions: versions already pinned in the READMEs or
  here, and versions confirmed from authoritative output (build errors,
  repository metadata, generator output); propose those for confirmation.
  Record the chosen version in the README tech stack section.
- **A CI vulnerability-scan failure unrelated to your diff is still your
  problem, and it gets fixed in place** — as its own commit on the branch that
  is open, never a second PR to unblock the first
  ([ADR-0024](docs/adr/0024-dependency-vulnerability-scanning.md)). It does
  not need asking first *only* while the fix stays inside the vulnerable
  package's already-declared semver range (a lockfile-only bump, no code
  change); crossing that range, or bumping a *direct* dependency past its pin,
  is a version choice under "new dependencies" above. Confirm the fix actually
  clears the finding before pushing, reproducing CI's exact Trivy invocation
  (`frontend/README.md`, `backend/README.md`) — a bump that doesn't reach the
  flagged transitive package leaves the finding red.
- **A CI check you have seen fail before is probably in
  [docs/ci-playbook.md](docs/ci-playbook.md)** — a red job mapped to the
  document that already explains the fix. Add an entry when a failure costs
  real time to *recognise*, and say which run it came from.

## Quality checks

The `/quality-sweep` skill runs a periodic, whole-codebase audit —
architecture, documentation, code quality, security — at a coarser grain than
any single PR's diff can judge. Its mechanics live in the skill and in
[the quality backlog](docs/tasks/quality-backlog.md)'s own header.

**Product-owner-initiated only, and this is the part that cannot move into the
skill:** it sets `disable-model-invocation`, so it is absent from an agent's
skill list and cannot announce itself. An agent should proactively *suggest*
running it at the start of a new iteration's first task, and never trigger it
or lift a finding into an iteration on its own. A full four-dimension subagent
review on every task before every PR stays **not adopted**
([ADR-0027](docs/adr/0027-process-weight.md)).

## Environment notes

- Each worktree runs `docker compose up` independently and will collide on
  ports 3000/8080/5432 if two are brought up at once — give a concurrently-
  running worktree its own `-p <project>` and port overrides, or only run
  the stack in one worktree at a time.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
