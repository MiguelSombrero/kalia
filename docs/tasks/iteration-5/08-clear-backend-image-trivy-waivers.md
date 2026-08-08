# Task 08: Clear the backend image's expiring Trivy waivers

- **Status:** needs-refinement
- **Iteration:** [5](../iteration-5.md)

## Why

`.trivyignore` holds five waived CVEs, all of them dated `exp:2026-08-26`.
They exist because `backend/Dockerfile`'s runtime stage is
`eclipse-temurin:25-jre`, whose Ubuntu 26.04 base ships Canonical's Pebble init
tool at `/usr/bin/pebble`. The `ENTRYPOINT` execs `java -jar app.jar` directly,
so Pebble is never invoked — these are CVEs in a binary the image carries and
never runs, with no `pom.xml` dependency to bump.

The deadline is what makes this a task rather than a note. The vulnerability
scan is deliberately diff-agnostic
([ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)), so once those
waivers expire the gate goes red on **every open pull request**, not only one
that touched something relevant. Iteration 5 has eight tasks and none has
started; if this queues behind the cellar work the expiry arrives first and
blocks all of it.

Re-dating the waivers would buy another cycle and leave the same decision
waiting. A base-image variant removes the finding outright.

## Scope

Move the runtime stage to `eclipse-temurin:25-jre-noble`, delete the five
backend waivers from `.trivyignore`, and update the pinned base image wherever
the docs record it.

## Non-goals

- A JDK major upgrade. `eclipse-temurin:26-jre` also measures clean and was
  considered and rejected below; if it is ever wanted it is its own task with
  its own ADR, not a side effect of clearing CVE waivers.
- The frontend image or its `.trivyignore` section, which already scans clean
  with no suppressions.
- Changing the waiver policy itself — the 30-day expiry and the reason-per-entry
  rule are [ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md)'s and
  stay as they are.

## Constraints

- **The runtime base image is `eclipse-temurin:25-jre-noble`** — product-owner
  decision, 2026-08-08. Same Java 25.0.3 on Ubuntu 24.04 LTS (supported to
  April 2029) rather than 26.04. Measured 2026-08-07: `25-jre` reported 5
  HIGH/CRITICAL, `25-jre-noble` reported 0. `26-jre` also reported 0 but changes
  the JDK major — `java.version` in `pom.xml`, the build-stage image, CI's
  `java-version`, and the README tech stack — and a Java version is decided on
  its own merits, not by a CVE deadline. `25-jre-alpine` reported 3 and its
  `apk` base breaks the Dockerfile's `apt-get install curl` step.
- **The five backend entries are deleted, not re-dated.** A criterion that only
  checks "the scan is green" passes just as happily against a re-dated waiver,
  which is why the deletion is stated here rather than left implied.
- **`curl` must survive in the runtime stage.** It is installed solely so the
  compose healthcheck can reach `/actuator/health`. A base-image change that
  breaks that layer — or tempts someone to drop it — silently degrades the
  healthcheck to a port-open probe, which a previous quality finding already
  closed once. The Dockerfile comment says "do not"; heed it.
- Record the chosen image in the README tech stack, which is the pinned
  reference for base images ([CLAUDE.md](../../../CLAUDE.md) new dependencies).
- Verify by reproducing CI's exact Trivy invocation locally
  ([backend/README.md](../../../backend/README.md)) before pushing. A bump that
  does not reach the flagged package leaves the finding red.

## Open questions

1. **Does the build stage follow?** `maven:3.9-eclipse-temurin-25` is a
   different image family and never ships — it is discarded at the end of the
   multi-stage build, so it cannot affect the scan. Matching it for consistency
   is defensible; leaving it alone is one less moving part.
2. **Where does the "why `-noble` and not `26-jre`" reasoning live?**
   `FROM eclipse-temurin:25-jre-noble` does not explain itself, and the next
   person to see a newer tag will wonder. An ADR, an amendment to
   [ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md), or a README
   line — the Constraints above already carry it, so the question is whether it
   needs a more durable home than a completed task file.
3. **What happens to `.trivyignore` once it holds only comments?** The frontend
   note in it is load-bearing — it says a future finding with a PkgPath under
   `/usr/local/lib/node_modules` means the package-manager removal regressed
   rather than that a new waiver is warranted. Keep the file for that note, or
   move the note into `frontend/README.md` and delete the file?

## Acceptance criteria

- [ ] `backend/Dockerfile`'s runtime stage is `eclipse-temurin:25-jre-noble`,
      and the five backend `CVE-...` lines are **removed** from `.trivyignore`
      rather than re-dated
- [ ] CI's exact Trivy invocation, run locally against the built backend image
      with those entries already deleted, reports **0** HIGH/CRITICAL with a fix
      available — the deletion-first ordering is what makes this criterion able
      to fail
- [ ] `docker compose up` reaches backend `healthy`, proving `curl` still
      installs on the new base — a port-open probe would pass without it, so
      this is checked against the healthcheck's own status
- [ ] `mvn clean verify` is green on the new base image
- [ ] The README tech stack names the new base image, and no doc still says
      `eclipse-temurin:25-jre`
- [ ] SHOULD-7 is in the Retired section of
      [quality-backlog.md](../quality-backlog.md), pointing at this task
- [ ] The CI vulnerability-scan job passes on the PR — the automated test that
      this actually cleared the finding rather than moved it

## Notes

Quality backlog **SHOULD-7**, raised 2026-08-07 with the measurements quoted in
Constraints. It was tagged `[needs decision]`; that decision — `25-jre-noble`
over `26-jre` — was taken by the product owner on 2026-08-08 before this file
was written, per the lifting rule in
[quality-backlog.md](../quality-backlog.md), and is recorded above as a
constraint rather than carried forward as a question.
