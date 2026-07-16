# CLAUDE.md

Instructions for AI agents working in this repository.

## Project

Kalia is a craft beer store: Next.js frontend (BFF pattern) + Spring Boot
modulith backend. Read before making changes:

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
- Update `docs/` (architecture, roadmap, ADRs) in the same PR when behavior
  or design changes; tick off completed roadmap tasks.
- Commit messages: imperative summary line, body explains what and why,
  reference the roadmap task.

## Repository layout

- `backend/` — Spring Boot modulith (Java, Maven)
- `frontend/` — Next.js (TypeScript)
- `docs/` — architecture, roadmap, ADRs
- `docker-compose.yml` — local infrastructure (PostgreSQL; Keycloak/Redis
  arrive with the auth iteration)

## Environment notes

- `gh` relies on `GITHUB_TOKEN` exported in `~/.zshrc`; in non-interactive
  shells run it as `zsh -ic 'gh …'`.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
