# ADR-0085: Java and Node follow long-term-support releases, so Dependabot stops proposing the newest major

- **Status:** accepted
- **Date:** 2026-10-25

## Context

Dependabot's Docker ecosystem reads `backend/Dockerfile` and proposes
`maven:3.9-eclipse-temurin-26-noble` for the
`maven:3.9-eclipse-temurin-25-noble` build stage, and would do the same for the
`eclipse-temurin:25-jre-noble` runtime stage (pull request #402). Every week it
finds a newer major tag, it proposes it again. Nothing recorded why the answer
is no, so each proposal looks like an oversight to whoever reads it.

Two forces decide it. The backend is built and run on Java 25 throughout
(`backend/pom.xml`, both Dockerfile stages, CI), and a mobile client is about
to be built against the API it serves, so the runtime is chosen for years of
support rather than for the newest language level. And Lombok's annotation
processor reaches into `javac` internals, so a JDK newer than 25 fails the
`compile` goal ([backend/README.md](../../backend/README.md), "Maven must run
on JDK 25").

## Decision

**The backend stays on Java 25 until the next long-term-support Java release,
and `.github/dependabot.yml` ignores semver-major updates of the `maven`,
`eclipse-temurin` and `node` images so neither a non-LTS Java nor a non-LTS
Node is proposed again.**

The move to a later LTS release is a manual change made on purpose: the JDK
pin in `pom.xml` and the `backend/Dockerfile` build and runtime stages, with
Lombok confirmed to compile on it first. The same holds for Node, whose
even-numbered releases are the LTS ones
([task 21](../tasks/iteration-8.5/21-node-26-replaces-node-24.md)). The rule
is scoped to those two images because the other Docker and compose images
(Postgres, Keycloak, Mailpit, Valkey) are ones whose majors are wanted.

## Alternatives considered

- **Follow Dependabot to Java 26.** Rejected: 26 is not a long-term-support
  release, so the backend would sit on a line that stops receiving updates
  months after the mobile client ships against it, and Lombok already fails to
  compile on a newer JDK than 25 (seen on 27).
- **Close each proposal by hand.** Rejected: it works until it is forgotten,
  and a merged proposal breaks the build rather than being merely noisy.
- **Ignore every Docker major.** Rejected: it would silence the Postgres and
  Keycloak majors the project does want to take.

## Consequences

- Good, because the weekly Java and Node major proposals stop, so a Dependabot
  pull request that does appear is one worth reading.
- Bad, because a wanted Java or Node major now needs someone to remember it:
  nothing proposes it, so the next LTS date is a calendar fact with no pull
  request to carry it.
- Bad, because the rule may not suppress the Java proposal. The `maven` image's
  tag leads with Maven's own version (`3.9`) and carries the Java number in its
  suffix, so Dependabot may not class a 25 → 26 change as semver-major. That
  is confirmed against the first Dependabot run after merge; if #402 returns,
  the ignore widens to a `versions` pattern for the tag.
- Neutral, because Dependabot still proposes minor and patch updates of both
  images, which are the security-relevant ones.
- **Revisit trigger:** the next Java long-term-support release, or Lombok
  supporting the JDK after 25 — whichever comes first.
