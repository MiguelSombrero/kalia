# Task 12: The process documents name what exists

- **Status:** needs-refinement
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

The documents agents read to know where the project stands and how to work in
it have drifted from the repository, the failure goal 1 of
[`CLAUDE.md`](../../../CLAUDE.md) exists to prevent. Five findings, all in
process documents:

- **Which iteration is open** (MUST-24). `docs/architecture.md` says "No
  iteration is in progress" and [`docs/roadmap.md`](../../roadmap.md) marks
  iteration 10.5 `⬜ Todo`, though tasks of it are `done`. `implement-task`
  step 11 says how to update these lines when an iteration closes, and no step
  marks one in progress when its first task finishes, so every iteration
  starts with a false statement.
- **The playbook** (MUST-25). `docs/ci-playbook.md`, where a red check is
  looked up, still names the pre-rename `frontend/` in a heading, paths, "the
  frontend container" and an entry whose remedy, `(cd frontend && npm ci)`, is
  wrong twice: the target is `web-build`, and workspaces install by `npm ci`
  at the repository root.
- **Where versions live** (COULD-125). `CLAUDE.md`'s "New dependencies" and
  `README.md` list `backend/pom.xml`, `web/package.json`, compose files,
  Dockerfiles and workflows as manifests, omitting `mobile/package.json`,
  `packages/*/package.json`, the root `package.json` and the toolchain pin
  files `mobile/README.md` and `mobile-doctor.mjs` treat as homes — so an agent
  applying the "already pinned in a manifest" exception would not recognise a
  mobile pin. `CLAUDE.md` is at 197 of its 200 lines.
- **The `worktree` skill** (COULD-128) says `claude --worktree <name>` "does the
  equivalent", but it creates `claude/<name>-<hash>` branches, against
  `CLAUDE.md`'s naming rule. #416, #476 and #522 merged under such names.
- **`design-task` step 9** (COULD-130) lists `make verify` among
  `implement-task`'s gates, where `implement-task` step 9 and `CLAUDE.md` make
  `make verify-fast` the local gate.

## Scope

Each is corrected: the open iteration is marked in the docs, by a step in
`implement-task` that does it when an iteration's first task finishes (or by a
check, per the open question); the playbook names `web/` and the commands that
work; the lists of manifests include every home a version has; the `worktree`
skill tells an agent to rename a harness-made branch before its first push; and
`design-task` step 9 names the right gate.

## Non-goals

- Re-auditing every document for staleness, which is the sweep's.
- Task 01's amendment of `design-task` for the app; the two edit different
  steps of one skill.

## Constraints

- `CLAUDE.md` stays under 200 lines
  ([ADR-0048](../../adr/0048-what-survives-a-claude-md-bullet.md)); the
  manifest list gains entries without gaining lines, which may mean pointing at
  one home instead of listing.
- A skill orders gates and changes none of them
  ([ADR-0062](../../adr/0062-a-design-task-is-a-skill-and-a-marker.md)).
- Each fact has one home
  ([ADR-0020](../../adr/0020-documentation-roles.md)), so the manifest list is
  stated in one place and pointed at from the other.
- Whichever of iteration 10.5 and this task finishes second, the open-iteration
  fix is about the iteration that is open then, not 10.5.

## Open questions

- **Functional scope.** A step in `implement-task`, or a check that fails when
  an index has a `done` task and `roadmap.md` still says `⬜ Todo` — the second
  cannot be forgotten; does it belong in `check-tasks.mjs`?
- **Completion signals.** A check that fails a document naming a path that no
  longer exists, for `ci-playbook.md` at least.
- **Module boundaries.** Where the manifest list lives (`CLAUDE.md`, the root
  README, or `mobile-doctor.mjs`'s list).

## Acceptance criteria

- [ ] `docs/architecture.md` §1 and `docs/roadmap.md` agree with the iteration
      indexes about which iteration is in progress, and `implement-task` has
      the step that keeps them so — or `make check` fails when they disagree,
      with a fixture test for it
- [ ] `docs/ci-playbook.md` names no `frontend/` path, and a test fails a path
      it names that does not exist
- [ ] `CLAUDE.md` and `README.md` agree on where a version lives, and every
      manifest `scripts/mobile-doctor.mjs` reads is among them; `CLAUDE.md` is
      under 200 lines
- [ ] The `worktree` skill and `design-task` step 9 say what the findings ask
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) MUST-24, MUST-25,
COULD-125, COULD-128 and COULD-130. Runs first, since it fixes the documents
the rest of the iteration is worked from.
