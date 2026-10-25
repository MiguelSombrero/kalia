# Task 21: Node 26 replaces Node 24 everywhere it is pinned

- **Status:** refined
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
CI, a contributor's machine and the documentation name. The frontend builds,
passes its tests and runs its end-to-end suite on it, and both images still
scan clean. The decision to stay on Java 25, and why, is an ADR, and Dependabot
stops proposing a new major of the Node and Java base images, so neither
proposal returns weekly.

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
- **The move lands now, on `node:26-alpine`.** The tag exists, Next.js
  requires only Node 20.9 or newer, and waiting for the 2026-10-28 LTS date
  would change only a label while CI and the images disagreed.
- **A `.node-version` file at the repository root holds the Node major, and the
  five `setup-node` steps read it with `node-version-file`.** CI's pins become
  one, and nvm, fnm and asdf pick it up locally. There is no `engines` field.
  The two Docker tags stay where Dependabot edits them; nothing checks the
  three against each other, so the acceptance grep is the only guard.
- **The mobile toolchain's Node range is not a gate.** It is a Non-goal chosen
  in [iteration 9](../iteration-9.md); if it needs another Node, that
  iteration raises its own task.
- **Staying on Java 25 is a new ADR** ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md):
  Java 26 was credibly proposed and rejected, it binds work now, and
  Dependabot keeps raising it). The Lombok note in `backend/README.md` stays
  the how.
- **Dependabot ignores `version-update:semver-major` for the `node` and
  `maven` images only** — not the other Docker or compose images, whose majors
  are wanted. Whether it parses `3.9-eclipse-temurin-25-noble` as a major is
  confirmed against the next Dependabot run, not assumed; the rule and its
  reason are commented in `.github/dependabot.yml`. A wanted Node or Java major
  is then a manual change, which the ADR says.

## Open questions

**None.**

## Acceptance criteria

- [ ] No file outside historical records names Node 24 as the current runtime
      — verified by `git grep -n -E "node:24|node-version: '24'|Node 24"`
      returning only the dated evidence lines in ADRs and task files, and by
      `.node-version`, `frontend/Dockerfile` and `docker-compose.yml` naming
      the same major
- [ ] The frontend's unit, build and e2e tests pass on Node 26: `make verify`
      is green and the CI jobs, which read `.node-version`, print `v26` for
      `node --version` — verified from the pull request's CI log
- [ ] Both images build on Node 26 and the CI vulnerability scan passes with no
      waiver added to `.trivyignore.yaml`
- [ ] An ADR records why Java stays on 25, linked from `backend/README.md`'s
      JDK note, and Dependabot's Java 26 proposal (#402) is closed with a
      pointer to it
- [ ] `.github/dependabot.yml` ignores semver-major for the `node` and `maven`
      images with the reason commented, and the next Dependabot run proposes
      neither Node 27 nor Java 26 — verified from that run

## Notes

Provenance: Dependabot pull requests #402, #403 and #405, opened after
[task 14](14-cve-gate-and-updates-trustworthy.md) added the Docker ecosystems.
These are the first real updates its new coverage produced.
