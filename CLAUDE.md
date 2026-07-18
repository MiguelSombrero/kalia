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

## Workflow

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Never commit directly to `dev`.** Every task gets a feature branch off
  up-to-date `dev` (naming: `iteration-N/<topic>`, `docs/<topic>`,
  `fix/<topic>`) and is merged back via pull request.
- Test-first: write or update tests with the code; all suites green before
  a PR. Verify changes by actually running them (e.g. `docker compose up`,
  hitting the endpoint), not just by compiling.
- **Doc-sync gate (part of definition of done):** before opening a PR,
  re-read the sections of `docs/architecture.md`, `docs/roadmap.md`, and any
  ADRs the change touches. Update them in the same PR, or state explicitly in
  the PR description that they were checked and remain accurate. A PR without
  this is incomplete.
- Tick off completed roadmap tasks in `docs/roadmap.md` as part of the PR
  that completes them.
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

## Repository layout

- `backend/` — Spring Boot modulith (Java, Maven)
- `frontend/` — Next.js (TypeScript)
- `docs/` — architecture, roadmap, ADRs
- `docker-compose.yml` — local infrastructure (PostgreSQL; Keycloak/Redis
  arrive with the auth iteration)
- `.github/workflows/ci.yml` — build + test both apps on every push

## Environment notes

- `gh` relies on `GITHUB_TOKEN` exported in `~/.zshrc`; in non-interactive
  shells run it as `zsh -ic 'gh …'`.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
