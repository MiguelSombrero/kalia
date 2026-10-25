# Task 21: Node 26 replaces Node 24 everywhere it is pinned

- **Status:** needs-refinement
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

**Node 24 left active support on 2026-10-20, and Node 26 becomes LTS on
2026-10-28** (nodejs.org's release schedule). The frontend is about to be
joined by a mobile client, and the runtime it builds and tests on should be the
one that will be supported through that work, not the one entering
maintenance. `frontend/package.json` already declares `@types/node: ^26`, so
the types are ahead of the runtime they describe.

**Dependabot cannot make the move.** It proposes `node:26-alpine` for
`frontend/Dockerfile` and `docker-compose.yml` as two separate pull requests
(#403, #405). Node 24 is also pinned in the five `setup-node` steps of
`.github/workflows/ci.yml` and named in comments in `docker-compose.yml`,
`vulnerability-scan.yml`, `.trivyignore.yaml` and
[ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md). Merging
either pull request alone leaves CI building and testing on Node 24 while the
images run Node 26, so what CI proves is not what ships.

**Java stays on 25, and that has no home yet.** Dependabot also proposes
`maven:3.9-eclipse-temurin-26-noble` (#402). Java 25 is a long-term-support
release and the whole backend is built on it; 26 is not, and Lombok's
annotation processor already fails on a newer JDK than 25 (`backend/README.md`,
"Maven must run on JDK 25"; seen here on JDK 27). Without a recorded reason the
proposal returns weekly.

## Scope

Node 26 is the one Node version the frontend image, the compose helper image,
CI and the documentation name. The frontend builds, passes its tests and runs
its end-to-end suite on it, and both images still scan clean. The decision to
stay on Java 25, and why, is recorded where the next reader of a Dependabot
proposal will find it.

## Non-goals

- **Java.** It stays on 25; this task records that and changes no Java pin.
- **Upgrading other dependencies** because a Node move makes them possible.
  Dependabot's other open pull requests are independent.
- **The mobile client's own toolchain**, which is chosen when that work starts.

## Constraints

- [ADR-0024](../../adr/0024-dependency-vulnerability-scanning.md): both images
  must scan clean with `HIGH`/`CRITICAL` findings that have a fix available
  failing the scan; the frontend runtime stage's package-manager removal must
  still apply on the new base, and `.trivyignore.yaml`'s note about it names
  the old tag.
- **The version is recorded in the manifest that installs it and nowhere else**
  ([ADR-0020](../../adr/0020-documentation-roles.md)); comments that name a
  tag are updated with it.
- CLAUDE.md: this Next.js version postdates model training, so Node 26 support
  is checked in `frontend/node_modules/next/dist/docs/` before anything is
  assumed about it.
- `make verify` is the gate and its image scans are CI-only
  ([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md)), so the
  two images are scanned by the pull request's own CI run.
- `package-lock.json` changes only where the Node move requires it; a local npm
  that differs from the one that produced the lockfile adds normalization
  noise (`frontend/README.md`).

## Open questions

- **When?** Now, on the `node:26-alpine` tag that already exists, or after the
  2026-10-28 LTS date? The work is identical; only the label differs.
- **What does the mobile toolchain need?** If it is React Native or Expo, its
  supported Node range should be checked against 26 before this lands, because
  it may pick the version for us.
- **Should local Node be pinned?** The repository has no `engines` field,
  `.nvmrc` or `.node-version`, so a contributor's Node drifts from CI's
  silently. Adding one is a small addition here; leaving it is the status quo.
- **Should a check keep the pins in step?** Node is named in about nine
  places and Dependabot edits two. A checker in `make check` that fails when
  they disagree would turn this task's manual grep into a mechanism
  ([ADR-0039](../../adr/0039-mechanisms-for-recurring-rule-violations.md)), at
  the cost of one more script to maintain.
- **Does staying on Java 25 get an ADR?** A decision earns one when a credible
  alternative was rejected, it binds work now, and a later task will need the
  reasoning ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)); it
  fits all three, since Dependabot keeps proposing the alternative. The
  alternative home is this task's Notes.
- **Should Dependabot stop proposing the other versions?** An `ignore` rule for
  semver-major on the Docker entries keeps it from proposing Java 26 or 27
  and, after this task, Node 27 (a non-LTS line). The cost is that a wanted
  major then needs a manual change.

## Acceptance criteria

- [ ] No file outside historical records names Node 24 as the current runtime
      — verified by `git grep -n -E "node:24|node-version: '24'|Node 24"`
      returning only the dated evidence lines in ADRs and task files
- [ ] The frontend's unit, build and e2e tests pass on Node 26: `make verify`
      is green and the CI jobs print `v26` for `node --version` — verified
      from the pull request's CI log
- [ ] Both images build on Node 26 and the CI vulnerability scan passes with no
      waiver added to `.trivyignore.yaml`
- [ ] The Java 25 decision is recorded where the open questions settle, and
      Dependabot's Java 26 proposal (#402) is closed with a pointer to it

## Notes

Provenance: Dependabot pull requests #402, #403 and #405, opened after
[task 14](14-cve-gate-and-updates-trustworthy.md) added the Docker ecosystems.
These are the first real updates its new coverage produced.
