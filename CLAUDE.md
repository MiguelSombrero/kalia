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
  [docs/tasks/](docs/tasks/)
- [docs/adr/](docs/adr/) — decisions already made; don't relitigate them
  silently, propose a new ADR instead. New ones follow
  [docs/adr/template.md](docs/adr/template.md)
- [backend/README.md](backend/README.md) — run/test commands, Lombok/
  JSpecify/ArchUnit conventions, testing naming (`*Test`/`*IT`)
- [frontend/README.md](frontend/README.md) — run/test commands,
  feature-package conventions, TanStack Query/Zustand/i18next usage

## Workflow

- Work proceeds **one roadmap task at a time**, smallest reviewable change.
- **Match process weight to the task — default to working directly.**
  Nearly every `docs/tasks` item is a single- or few-file change: settle
  any open decision with the product owner, implement it directly, run
  `/code-review`, open the PR. Heavier machinery has to earn its place:
  - **Direct + `/code-review`** — the default, and the right answer for
    most roadmap tasks.
  - **A design-exploration skill** (e.g. `/feature-dev`) — for a genuinely
    new subsystem whose design is still open and where comparing
    alternatives pays, such as an iteration introducing a new module.
    Its cost is roughly flat regardless of task size.
  - **Subagent-driven execution** (e.g.
    `/superpowers:subagent-driven-development`) — only when a change spans
    enough files that one context would overflow. Its cost scales with
    the number of plan tasks, making it the worst fit for many small ones.

  Measured on this repo: subagent-driven execution burned ~1.1M tokens
  across eleven dispatches to produce ~60 lines of Java and an ADR, and
  >1M more on a docs-only file split; comparable work done directly runs
  ~100K. Those review layers check the diff against the spec, so they
  catch drift between the two but share the spec's blind spots — the two
  worst defects in that work (a dropped RFC-required header, and an ADR
  whose central premise was false) surfaced in the product owner's review
  and by running the code, not in any review layer. A written spec and
  plan are part of that cost: their main consumer is subagents, so when
  implementing directly, skip them and let the brainstorming dialogue and
  the resulting ADR carry the decision.
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
  re-read the sections of `docs/architecture.md`, the relevant
  `docs/tasks/iteration-N.md` file, and any ADRs the change touches. Update
  them in the same PR, or state explicitly in the PR description that they
  were checked and remain accurate. A PR without this is incomplete.
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
- Tick off completed tasks in the iteration's `docs/tasks/iteration-N.md`
  file as part of the PR that completes them, and update that iteration's
  Status in `docs/roadmap.md`'s index table if the whole iteration is now
  done.
- **Iteration DoD gate:** never declare an iteration complete because its
  last task is ticked. Re-read the iteration's "Done when" in its
  `docs/tasks/iteration-N.md` file and verify each criterion by actually
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
- **ADRs follow [template.md](docs/adr/template.md)**
  ([ADR-0019](docs/adr/0019-adr-format-and-conventions.md)). Five sections:
  Context, Decision, Alternatives considered, Consequences, and an optional
  Evidence. The Decision section opens with one self-contained sentence
  naming what was decided — a reader who jumps to that heading must find the
  verdict in its first line, not a specification of files and function calls.
  Context states the problem only; measurements go in Evidence, rejected
  options in Alternatives considered, and "none, because X was the only
  realistic option" is a required entry there rather than an empty section.
  Consequences must record at least one Bad or Neutral entry. `Status` holds
  a vocabulary token; supersession detail goes in `Supersedes` /
  `Superseded-by` / `Amended` fields, never in the index, which carries no
  prose. Amend rather than rewrite an accepted ADR — it records what was
  believed when written, and that is most of its value.
- **Each documented fact has one home** ([ADR-0020](docs/adr/0020-documentation-roles.md)).
  ADRs record *why* — the problem, the options weighed, what it cost.
  `docs/architecture.md` records *shape* — module map, layer direction, data
  flow. READMEs record *how* — the commands and day-to-day rules for that
  codebase, short enough to catch at a glance. Every other mention is a
  one-line pointer with a link, never a paraphrase. Two exceptions: this file
  may restate anything that applies to every edit, since it is the only
  document loaded unconditionally and a pointer here is one an agent never
  follows; and a rule whose violation fails *silently* keeps its warning
  inline wherever an editor meets it, per ADR-0017's enforcement test. When a
  README rule outgrows one line and has no ADR, that is the signal to write
  the ADR — not to let the section grow.
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
appended to `docs/tasks/quality-backlog.md`, opened as its own PR for
review like any other change.

**Lifting findings into an iteration:** the product owner reviews the
backlog and tells an AI agent which findings to promote — by ID
(`MUST-1`, `SHOULD-3`, ...), a range, or a one-off description for
anything not yet in the backlog. Findings marked `[needs decision]` get
resolved in that conversation before they're written up as a task, not
silently guessed at. Each lifted task keeps a backreference to its origin
(e.g. "(Quality backlog 2026-07-23, MUST-3)") so the history isn't lost
once it's off the backlog — the date matters because IDs reset each
sweep, so `MUST-3` alone isn't unique across sweeps. The finding is
removed from the Quality backlog in the same PR that adds it as a real
task.

Not adopted: a full four-dimension subagent review on every single task
before every PR. Architecture and documentation need more context than one
small task provides — running them that often would be noisy and
re-litigate settled decisions, against the "smallest reviewable change"
cadence above.

## Repository layout

- `backend/` — Spring Boot modulith (Java, Maven)
- `frontend/` — Next.js (TypeScript)
- `docs/` — architecture, roadmap, per-iteration tasks, ADRs
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
- Each worktree runs `docker compose up` independently and will collide on
  ports 3000/8080/5432 if two are brought up at once — give a concurrently-
  running worktree its own `-p <project>` and port overrides, or only run
  the stack in one worktree at a time.
- Docker Desktop may need starting: `open -a Docker`, then wait for
  `docker info` to succeed.
