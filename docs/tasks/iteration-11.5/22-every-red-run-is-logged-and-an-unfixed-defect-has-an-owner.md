# Task 22: Every red run is logged, and a defect left unfixed names who fixes it

- **Status:** needs-refinement
- **Iteration:** [11.5](../iteration-11.5.md)
- **Covers:** none

## Why

[ADR-0084](../../adr/0084-an-unexpected-failure-is-logged-as-it-happens-and-counted-by-the-sweep.md)
has agents log each unexpected failure in
[common-failures](../../common-failures.md) as it happens, and the quality
sweep counts the rows. The log misses two things:

- **Most failures seen only in CI are missing.** Not logged since 2026-10-27:
  - the Gates "Range" failures on PRs 467 and 470 (four runs);
  - the `check-pr-body` false positives on PRs 513 and 515;
  - `dev` run 41076206163 (`plexus-xml` not found);
  - three vulnerability-scan image builds on 2026-11-01;
  - CodeQL on PR 541;
  - a full disk on PR 534;
  - the `PluginError` that fix branch #538 exists for.

  The backlog's counts come out low as a result: one finding cited three Range
  rows for five PRs, another two CodeQL hits for four. Logging as you go works
  for local failures. It does not work for workflows other than `CI`, or for
  Dependabot branches, where no agent is watching.
- **A row can record a live defect with no owner.** The 2026-10-31 row for run
  41231274792 says "not fixed here" and names nothing that will fix it. The
  defect stayed unfiled until the sweep found it. `check-pr-body.mjs` already
  refuses a pull request body that defers a finding without a quality-backlog
  ID. The log has no such rule, so a deferral there is lost the way bare
  "follow-ups" used to be.

The sweep decides from these counts what becomes a task. Iteration 12's
offline sync and its Maestro flows will add failure modes that only CI sees.

## Scope

- Red runs in CI reach the log or the sweep, from every workflow and from
  pull request branches, in the way refinement chooses.
- A row whose failure is a repository defect left unfixed names a
  quality-backlog ID, a task or a playbook entry. A cause outside the
  repository, such as a registry outage, needs no owner.
- ADR-0084 is amended to say both.
- The failures listed above are backfilled, or left to the next sweep, as
  refinement decides.

## Non-goals

- Logging machine or emulator problems. Only repository defects and CI
  failures are logged, and nothing from the host machine is
  ([CLAUDE.md](../../../CLAUDE.md)).
- A dashboard of CI health.

## Constraints

- **ADR-0084 is accepted.** The change is an amendment
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).
- **The quality sweep is started by the product owner only** and its
  mechanics live in its skill ([CLAUDE.md](../../../CLAUDE.md)). A step added
  to the sweep is a change to `.claude/skills/quality-sweep/`.
- **A check has to tell "not fixed" from "not ours".** A rule that flags a
  registry outage as an unowned defect would be ignored within a week.

## Open questions

- **Functional scope.** Choose one (SHOULD-116, `[needs decision]`):
  - widen the `worktree` skill's step that reads red runs to every workflow
    and to pull request branches;
  - have the sweep collect red runs itself with `gh run list`, and narrow the
    log to local failures that leave no trace;
  - accept the undercount.
- **Completion signals.** Enforce the owner rule with a sentence in the log's
  header and in the ADR, or with a checker in `make check` (SHOULD-101,
  `[needs decision]`)? How would a checker tell a cause outside the
  repository apart from a defect?
- **Functional scope.** Are the listed CI failures backfilled into the log in
  this task?

## Acceptance criteria

- [ ] ADR-0084 is amended with the chosen collection route and the owner rule
- [ ] If refinement adopts a checker, its test fails a fixture row that leaves
      a defect unfixed with no owner and passes a row whose cause is a
      registry outage
- [ ] The 2026-10-31 row for run 41231274792 names its owner
- [ ] If the sweep collects runs itself, its skill names the command and a
      dry run on this branch lists the red runs since the last sweep
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-101 and
SHOULD-116, both `[needs decision]`.
