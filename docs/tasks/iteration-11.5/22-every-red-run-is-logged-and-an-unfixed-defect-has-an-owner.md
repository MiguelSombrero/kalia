# Task 22: Every red run is logged, and a defect left unfixed names who fixes it

- **Status:** refined
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

- The quality sweep collects red CI runs itself, from every workflow and
  from pull request branches, and the log holds local failures.
- A row whose failure is a repository defect left unfixed names a
  quality-backlog ID, a task or a playbook entry. A cause outside the
  repository, such as a registry outage, needs no owner.
- ADR-0084 is amended to say both.
- The existing rows gain their cause kind.

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
- **Decided at refinement (2026-11-15):**
  - **Collection (SHOULD-116):** the quality sweep collects the red runs
    since the last sweep itself with `gh run list`, across every workflow and
    pull-request branch, Dependabot's included. `common-failures.md` narrows
    to local failures that leave no trace in CI.
  - **No backfill into the log.** The sweep's first collection reaches back
    to 2026-10-27, the earliest unlogged run in Why, so the runs listed there
    are counted. Later collections start from the previous sweep.
  - **Owner rule (SHOULD-101):** a checker in `make check`. Each row names a
    cause kind, `defect` or `external`. A `defect` row not marked fixed must
    name a quality-backlog ID, a task or a playbook entry. An `external` row,
    such as a registry outage, needs no owner.

## Open questions

**None.**

## Acceptance criteria

- [ ] ADR-0084 is amended with the chosen collection route and the owner rule
- [ ] The checker's test fails a fixture `defect` row left unfixed with no
      owner, passes an `external` row for a registry outage, and fails a row
      with no cause kind; every existing row passes
- [ ] The 2026-10-31 row for run 41231274792 names its owner
- [ ] The sweep's skill names the command, and a dry run on this branch lists
      the red runs since 2026-10-27, the runs named in Why among those still
      inside GitHub's retention
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-101 and
SHOULD-116, both `[needs decision]`.
