# Task 08: Clear the backend image's expiring Trivy waivers

- **Status:** done
- **Iteration:** [5](../iteration-5.md)
- **Covers:** none

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

Move the runtime stage to `eclipse-temurin:25-jre-noble` and the build stage
to its matching `-noble` variant, delete the five backend waivers from
`.trivyignore`, and update the pinned base image wherever the docs record it.

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
- **The build stage's `maven:3.9-eclipse-temurin-25` image moves to its
  matching `-noble` variant alongside the runtime stage** — product-owner
  decision, 2026-08-10. It is discarded at the end of the multi-stage build
  and cannot affect the scan, but keeping both stages on the same Ubuntu base
  is worth the consistency.
- **The "why `-noble` and not `26-jre`" reasoning lives in
  `backend/README.md`'s tech stack**, next to the pinned image tag —
  product-owner decision, 2026-08-10. Not a new ADR or an ADR-0024 amendment:
  this is a base-image tag choice, not a standalone architectural decision.
- **`.trivyignore` stays even once the five backend entries are gone** —
  product-owner decision, 2026-08-10. The frontend note is load-bearing and
  stays exactly where a future scan-finding investigator will look first,
  right next to where waivers go.

## Open questions

**None.**

## Acceptance criteria

- [x] `backend/Dockerfile`'s runtime stage is `eclipse-temurin:25-jre-noble`
      and its build stage is the matching `-noble` variant of
      `maven:3.9-eclipse-temurin-25`, and the five backend `CVE-...` lines are
      **removed** from `.trivyignore` rather than re-dated
- [x] CI's exact Trivy invocation, run locally against the built backend image
      with those entries already deleted, reports **0** HIGH/CRITICAL with a fix
      available — the deletion-first ordering is what makes this criterion able
      to fail
- [x] `docker compose up` reaches backend `healthy`, proving `curl` still
      installs on the new base — a port-open probe would pass without it, so
      this is checked against the healthcheck's own status
- [x] `mvn clean verify` is green on the new base image
- [x] The README tech stack names the new base image and states why `-noble`
      was chosen over `eclipse-temurin:26-jre`, and no doc still says
      `eclipse-temurin:25-jre`
- [x] `.trivyignore` still exists with only its frontend note remaining
- [x] SHOULD-7 is in the Retired section of
      [quality-backlog.md](../quality-backlog.md), pointing at this task
- [x] The CI vulnerability-scan job passes on the PR — the automated test that
      this actually cleared the finding rather than moved it

## Notes

Quality backlog **SHOULD-7**, raised 2026-08-07 with the measurements quoted in
Constraints. It was tagged `[needs decision]`; that decision — `25-jre-noble`
over `26-jre` — was taken by the product owner on 2026-08-08 before this file
was written, per the lifting rule in
[quality-backlog.md](../quality-backlog.md), and is recorded above as a
constraint rather than carried forward as a question.
