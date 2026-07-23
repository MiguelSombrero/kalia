# CLAUDE.md

Instructions for AI agents working in this repository.

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

**Roles:** MiguelSombrero is the product owner — sets vision and goals,
makes architecture decisions, guides design, reviews code; he does not code.
AI agents produce all documentation and code.

## Project

Kalia is a craft beer management app and online beer store: Next.js frontend
(BFF pattern) + Spring Boot modulith backend. Enthusiast features (catalog,
personal cellar) come first; the store flow is a backlog decision. Read
before making changes:

- [docs/architecture.md](docs/architecture.md) — module boundaries, API
  conventions, persistence rules, testing strategy
- [docs/roadmap.md](docs/roadmap.md) — what to build and in which order
- [docs/adr/](docs/adr/) — decisions already made; don't relitigate them
  silently, propose a new ADR instead
- [backend/README.md](backend/README.md) — run/test commands, Lombok/
  JSpecify/ArchUnit conventions, testing naming (`*Test`/`*IT`)
- [frontend/README.md](frontend/README.md) — run/test commands,
  feature-package conventions, TanStack Query/Zustand/i18next usage

## Workflow

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Never commit directly to `dev`.** Every task gets a feature branch off
  up-to-date `dev` (naming: `iteration-N/<topic>`, `docs/<topic>`,
  `fix/<topic>`) and is merged back via pull request.
- Test-first: write or update tests with the code; all suites green before
  a PR. Verify changes by actually running them (e.g. `docker compose up`,
  hitting the endpoint), not just by compiling.
- **Open the PR automatically once a task is done** — don't wait for an
  explicit "create the PR" instruction. "Done" means: tests green, changes
  verified by running them, doc-sync check complete, roadmap task ticked.
  Push the branch and run `gh pr create` with a description covering what
  changed, why, and anything worth a reviewer's attention, the moment those
  conditions hold. The PR is the review gate, not its creation — opening one
  doesn't merge anything or touch `dev`; merging stays the product owner's
  explicit action on GitHub. This does not relax any other gate (doc-sync,
  iteration DoD, dependency confirmation, review-comment discipline) — a
  task isn't "done" if those are unmet, so the PR doesn't open until they are.
- **Doc-sync gate (part of definition of done):** before opening a PR,
  re-read the sections of `docs/architecture.md`, `docs/roadmap.md`, and any
  ADRs the change touches. Update them in the same PR, or state explicitly in
  the PR description that they were checked and remain accurate. A PR without
  this is incomplete.
- **Code-review gate (part of definition of done):** before opening a PR,
  run `/code-review` on the diff — locally, in-session, no separate service
  or billing involved. For each finding worth acting on, mark it **fix now**
  (implement it in the current PR) or **new task** (turn it into a backlog
  item instead); not every finding needs a task. Covers diff-local security
  (injection, XSS, auth flaws, secrets), performance (N+1s, complexity,
  leaks), correctness (edge cases, race conditions, error handling), and
  maintainability (smells, duplication, naming, test coverage) — see
  "Quality checks" below for the broader, whole-codebase checks this alone
  doesn't cover.
- Tick off completed roadmap tasks in `docs/roadmap.md` as part of the PR
  that completes them.
- **Iteration DoD gate:** never declare an iteration complete because its
  last task is ticked. Re-read the iteration's "Done when" in
  `docs/roadmap.md` and verify each criterion by actually running it; if
  any is unmet, add tasks to the iteration to close the gap. Apply the same
  coverage check when planning an iteration: tasks must collectively
  guarantee the "Done when", otherwise fix the tasks or the criteria.
- **Code review is a dialogue.** Analyze every review comment critically —
  architecture, security, code quality, API design, testability — before
  acting. Agreeing: implement and reply with what changed. Disagreeing:
  reply in the review thread with the concern and a concrete alternative,
  and make **no code changes** until the discussion settles. If the product
  owner's decision stands after discussion, implement it. Conventions that
  emerge from review decisions get documented (CLAUDE.md, backend/frontend
  README, or docs/) in the same PR.
- Commit messages: imperative summary line, body explains what and why,
  reference the roadmap task.
- **New dependencies: ask, don't research.** When a task introduces a new
  dependency (library, starter, plugin, Docker image, GitHub Action), do not
  spend time hunting registries for the latest version. List the new
  dependencies and ask the user which versions to use — batched in one
  question per task. Exceptions: versions already pinned in README/docs or
  this file, and versions already confirmed from authoritative output (build
  errors, repository metadata, generator output) — propose those for
  confirmation instead. Record chosen versions in the README tech stack
  section so they become the pinned reference.

## Quality checks

Beyond the per-PR code-review gate above (diff-scoped, self-run), the
`/quality-sweep` skill (`.claude/skills/quality-sweep/SKILL.md`) runs a
periodic, whole-codebase check — architecture, documentation, code
quality, and security — at a coarser grain than any single PR can judge.
Product-owner-initiated only, never something an AI agent triggers itself:
run it before the first task of a new iteration, or whenever else it's
wanted. **An AI agent should proactively suggest running it at the start
of a new iteration's first task** — surfacing the option, not deciding for
the product owner. Output is a MUST/SHOULD/COULD-categorized task list
appended to `docs/roadmap.md`'s "Quality backlog", opened as its own PR
for review like any other change.

Not adopted: a full four-dimension subagent review on every single task
before every PR. Architecture and documentation need more context than one
small task provides — running them that often would be noisy and
re-litigate settled decisions, against the "smallest reviewable change"
cadence above.

## Repository layout

- `backend/` — Spring Boot modulith (Java, Maven)
- `frontend/` — Next.js (TypeScript)
- `docs/` — architecture, roadmap, ADRs
- `docker-compose.yml` — full local stack (PostgreSQL + backend + frontend;
  Keycloak/Redis arrive with the auth iteration). Frontend (`:3000`) and
  backend (`:8080`, for direct API access and Swagger UI) are both
  published, localhost-only.
- `.github/workflows/ci.yml` — build + test both apps on every push
- `.claude/skills/quality-sweep/SKILL.md` — periodic quality sweep (see
  Quality checks above)

## Environment notes

- `gh` relies on `GITHUB_TOKEN` exported in `~/.zshrc`; in non-interactive
  shells run it as `zsh -ic 'gh …'`.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
