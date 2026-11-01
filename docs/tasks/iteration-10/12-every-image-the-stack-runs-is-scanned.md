# Task 12: Every image the stack runs is scanned, and a mirror outage is not a finding

- **Status:** refined
- **Iteration:** [10](../iteration-10.md)
- **Covers:** none

## Why

[ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md) fails a merge
on a HIGH or CRITICAL CVE, but only in the images it scans.
`.github/workflows/vulnerability-scan.yml` builds and scans `backend`, `web`
and `edge` only, though `keycloak/Dockerfile` is a custom build; the pulled
`valkey`, `postgres`, `keycloak-config-cli` and `mailpit` images are not
scanned either. A CVE in Keycloak, the component this iteration puts in front
of a phone, never fails the gate (SHOULD-71).

The gate also fails for reasons that are not findings: Trivy's Java DB mirror
returned 404 on runs 40166251873 (`dev`) and 40166341881 (PR #421) with a
clean filesystem scan, and `docs/ci-playbook.md`'s vulnerability-scan section
covers only CVE findings, so whoever meets it next has nothing to read
(COULD-92).

## Scope

Every image the deployable stack runs, built or pulled, is scanned by the
vulnerability gate, and the playbook says what to do when the scanner's own
database is unreachable.

## Constraints

- ADR-0024 and its waiver rules (`.trivyignore`); a CI vulnerability-scan
  failure is fixed on the open branch (`CLAUDE.md`).
- **No billed CI minute**: scanning more images must stay within the free
  runner's time.
- The image list is `docker-compose.base.yml`'s; a list kept by hand in the
  workflow drifts the day an image is added.

**Decided at refinement, 2026-11-01** (product owner):

- **The image list is derived** from `docker compose -f
  docker-compose.base.yml config --images`, so an image added to the base file
  is scanned without a second list to edit.
- **Only the deployable definition's images are scanned.** Images only the dev
  overlay runs — Mailpit once [task 11](11-the-deployable-stack-carries-no-dev-convenience.md)
  moves it there, and the seed job's `node` — are never deployed.
- **A pulled image follows the rules a built one does:** unfixed CVEs ignored
  as ADR-0024 already does for every scan, and a waiver needs an expiry.

## Open questions

**None.**

## Acceptance criteria

- [ ] The vulnerability-scan workflow scans the Keycloak build and every
      pulled image the base file runs, taking the list from `docker compose
      config --images`, and a test shows an image added to the base file is
      scanned
- [ ] A run of the workflow on the PR shows every image scanned
- [ ] `docs/ci-playbook.md` has a "re-run, change nothing" entry for the Java
      DB mirror failure, with the two run ids
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-71 and COULD-92.
