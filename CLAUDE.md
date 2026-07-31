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
- [docs/roadmap.md](docs/roadmap.md) — iteration index and status; detailed
  per-iteration task lists, the backlog, and the Quality backlog live under
  [docs/tasks/](docs/tasks/). From iteration 5 on, tasks are one file each,
  written to [docs/tasks/template.md](docs/tasks/template.md) before work
  starts
- [docs/adr/](docs/adr/) — decisions already made; don't relitigate them
  silently, propose a new ADR instead. New ones follow
  [docs/adr/template.md](docs/adr/template.md)
- [backend/README.md](backend/README.md) — run/test commands, Lombok/
  JSpecify/ArchUnit conventions, testing naming (`*Test`/`*IT`)
- [frontend/README.md](frontend/README.md) — run/test commands,
  feature-package conventions, TanStack Query/Zustand/i18next usage

## Commands

From the repository root — the parentheses matter, a bare `cd` persists into
the next command and breaks the one after it:

```bash
(cd backend  && mvn test)          # unit tests (*Test) — fast, no Docker
(cd backend  && mvn verify)        # + integration tests (*IT) — needs Docker
(cd frontend && npm test)          # vitest
(cd frontend && npm run test:e2e)  # playwright — needs the stack up
node scripts/check-adrs.mjs        # ADR ↔ architecture.md index
node scripts/check-tasks.mjs       # task files ↔ iteration index
```

Two things that fail silently if you skip them:

- **Use `mvn clean` after any `pom.xml` or plugin change** — an incremental
  build can report success against stale compiled output.
- `mvn verify 2>&1 | grep -E "Tests run:|ERROR|FAIL|BUILD"` cuts a green run
  from ~285 lines to ~13 while keeping every `Tests run:` count, but it drops
  assertion detail. **Re-run it unfiltered before diagnosing a failure.**

## Workflow

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Match process weight to the task — implement directly by default**
  ([ADR-0027](docs/adr/0027-process-weight.md)). Nearly every `docs/tasks`
  item is a single- or few-file change: settle any open decision with the
  product owner, implement it, run `/code-review`, open the PR. Reach past
  that only for the two conditions the ADR names — a design-exploration
  skill (e.g. `/feature-dev`) for a genuinely new subsystem whose design is
  still open, subagent-driven execution only when a change spans enough
  files that one context would overflow. Skip the implementation plan; never
  skip the task file ([ADR-0026](docs/adr/0026-task-file-format.md)).
- **Never start a task that is not `refined`.** From iteration 5 on, a task is
  a file under `docs/tasks/iteration-N/` following
  [the template](docs/tasks/template.md). A new one is created as
  `needs-refinement`, and **only the product owner moves it to `refined`** —
  never an agent on its own behalf. Getting there means writing down every
  question worth their opinion, including interface and wording choices they
  may want a say in, having that conversation, and recording the answers as
  constraints. `Open questions` must read `**None.**` from `refined` onward
  and `scripts/check-tasks.mjs` enforces that, but the status is the gate:
  an empty question list proves nothing about whether anyone looked.
  Acceptance criteria state how each outcome is verified, and at least one is
  an automated test, so tests are never a task of their own.
- **Never commit directly to `dev`.** Every task gets a feature branch off
  up-to-date `dev` (naming: `iteration-N/<topic>`, `docs/<topic>`,
  `fix/<topic>`) and is merged back via pull request.
- **Parallel sessions: one git worktree each, never a shared checkout.**
  Two AI-agent sessions running `git` commands against the same working
  directory race on its single `HEAD`/index — a `checkout` from one session
  can interleave with a `commit` from the other and misattribute the commit
  to the wrong branch. Before starting a session whose task doesn't depend
  on another session's in-flight work, give it its own worktree:
  `git worktree add ../kalia-<topic> -b <branch> dev`, point that session's
  working directory at the new path, and `git worktree remove` it once its
  PR merges. Worktrees share one object database, so this costs no extra
  clone — only isolation.
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
  re-read the sections of `docs/architecture.md`, the task file and its
  iteration index, and any ADRs the change touches. Update them in the same
  PR, or state explicitly in the PR description that they were checked and
  remain accurate. A PR without this is incomplete. The task file itself is
  the exception: it records what was *asked for*, so it is frozen at
  completion apart from its status — what shipped belongs in the ADR,
  `docs/architecture.md` and the READMEs.
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
- **Beyond the gates above, proactively reach for other available Claude
  Code skills when they'd genuinely help** — architecture review, design
  critique, accessibility audits, and similar — don't wait to be asked,
  but weigh each against the process-weight rule above: "genuinely help"
  means this task needs it, not that the skill exists and looks thorough.
  Skills are self-triggering by design (their own description is the
  signal); this is a reminder to act on that, not a list to maintain here.
  Unlike `/code-review` (bundled, always available), most other skills are
  marketplace plugins tied to whoever's running the session — don't
  hardcode specific plugin names as required steps, since they may not be
  installed for a future session or contributor.
- Check off every acceptance criterion and set the task's status to `done`,
  in both the task file and its iteration index, as part of the PR that
  completes it — a criterion that cannot honestly be checked means the task
  isn't done. Update that iteration's Status in `docs/roadmap.md`'s index
  table when the whole iteration is done. (Iterations 0–4 predate the task
  files: there, tick the task in `docs/tasks/iteration-N.md`.)
- **Iteration DoD gate:** never declare an iteration complete because its
  last task is ticked. Re-read the iteration's "Done when" in its index and
  verify each criterion by actually
  running it; if any is unmet, add tasks to the iteration to close the gap.
  Apply the same coverage check when planning an iteration: tasks must
  collectively guarantee the "Done when", otherwise fix the tasks or the
  criteria.
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
- **Code comments carry only what the repo cannot** ([ADR-0017](docs/adr/0017-code-comment-policy.md)).
  A comment earns its place only if it holds information not present
  anywhere in the repository and not derivable by reading it: external
  framework/library behavior, an empirical measurement, or a warning that
  a locally-correct edit is globally wrong. Everything else is a pointer —
  one line naming the ADR or doc section, never a paraphrase of it, since
  nothing guards a comment against the ADR it duplicates. Let the
  enforcement mechanism set the weight: if breaking the invariant fails a
  test, an ArchUnit rule or the build, that is the guard (comment at most
  one line, preferably pointing at the test); if it fails silently or only
  in production builds, the comment is mandatory and opens with "do not".
  Never narrate process — no task/PR/review references, no "used to be".
  That history belongs in the commit message and PR description, which are
  built to hold it; a code comment outlives them and becomes stale
  narration. Comments explaining why a test asserts something apparently
  pointless are load-bearing and stay: they stop a cleanup pass from
  deleting a guard.
- **ADRs follow [template.md](docs/adr/template.md)** — five sections
  (Context, Decision, Alternatives considered, Consequences, optional
  Evidence), Decision opening with one self-contained sentence naming the
  verdict, at least one Bad or Neutral consequence, and an accepted ADR
  amended rather than rewritten. `scripts/check-adrs.mjs` enforces the
  mechanical parts. See
  [ADR-0019](docs/adr/0019-adr-format-and-conventions.md).
- **Each documented fact has one home** — ADRs record *why*,
  `docs/architecture.md` records *shape*, READMEs record *how*; every other
  mention is a one-line pointer with a link. Two exceptions: this file may
  restate anything that applies to every edit, since it is the only document
  loaded unconditionally and a pointer here is one an agent never follows;
  and **a rule whose violation fails silently keeps its warning inline
  wherever an editor meets it** — compressing that class of rule into a link
  is a regression dressed as tidying. When a README rule outgrows one line
  and has no ADR, write the ADR. See
  [ADR-0020](docs/adr/0020-documentation-roles.md).
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

**Product-owner-initiated only, never something an AI agent triggers
itself.** An AI agent should proactively *suggest* running it at the start
of a new iteration's first task — surfacing the option, not deciding for
the product owner. Lifting a finding out of the backlog into an iteration
is likewise the product owner's instruction, never an agent's own call.

Findings land in [docs/tasks/quality-backlog.md](docs/tasks/quality-backlog.md),
whose header holds the mechanics — severity grouping, permanent IDs,
confirmed-dates, retirement, and how a finding is lifted into a task.

Not adopted: a full four-dimension subagent review on every task before
every PR. Architecture and documentation need more context than one small
task provides, so running them that often would be noisy and re-litigate
settled decisions ([ADR-0027](docs/adr/0027-process-weight.md)).

## Repository layout

- `backend/` — Spring Boot modulith (Java, Maven)
- `frontend/` — Next.js (TypeScript)
- `docs/` — architecture, roadmap, per-iteration tasks, ADRs
- `docker-compose.yml` — full local stack (PostgreSQL + backend + frontend +
  Keycloak + Valkey). Frontend (`:3000`) and backend (`:8080`, for direct
  API access and Swagger UI) are both published, localhost-only.
- `.github/workflows/ci.yml` — build + test both apps on every push;
  also scans dependencies and images for known CVEs
  ([ADR-0024](docs/adr/0024-dependency-vulnerability-scanning.md))
- `.github/dependabot.yml` — weekly update PRs for Maven, npm and GitHub
  Actions dependencies
- `.claude/skills/quality-sweep/SKILL.md` — periodic quality sweep (see
  Quality checks above)

## Environment notes

- `gh` relies on `GITHUB_TOKEN` exported in `~/.zshrc`; in non-interactive
  shells run it as `zsh -ic 'gh …'`.
- Each worktree runs `docker compose up` independently and will collide on
  ports 3000/8080/5432 if two are brought up at once — give a concurrently-
  running worktree its own `-p <project>` and port overrides, or only run
  the stack in one worktree at a time.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
