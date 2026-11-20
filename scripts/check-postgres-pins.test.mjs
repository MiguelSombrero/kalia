#!/usr/bin/env node
// Fixture self-test for check-postgres-pins.mjs. The real files agree, so the
// check never fires on them and would stay green even if it stopped reading.

import test from "node:test";
import assert from "node:assert/strict";

import { checkPostgresPins, PINS } from "./check-postgres-pins.mjs";

const pinned = (tag) => ({
  "postgres/Dockerfile": `FROM postgres:${tag}\n\nRUN true\n`,
  "docker-compose.base.yml": `services:\n  postgres:\n    image: postgres:${tag}\n    environment:\n      DATA_SOURCE_URI: postgres:5432/kalia\n`,
  "docker-compose.override.yml": `services:\n  postgres-exporter-init:\n    image: postgres:${tag}\n`,
  "backend/src/test/java/fi/kalia/TestcontainersConfiguration.java": `new PostgreSQLContainer(DockerImageName.parse("postgres:${tag}"));`,
  "backend/src/test/java/fi/kalia/DatabaseRolesIT.java": `new PostgreSQLContainer(DockerImageName.parse("postgres:${tag}"))`,
  ".github/workflows/ci.yml": `        run: node scripts/retry-registry.mjs -- docker pull postgres:${tag}\n`,
});

test("passes when every file pins the same tag", () => {
  assert.deepEqual(checkPostgresPins(pinned("18.6")), []);
});

test("names every file and the tag it holds when one pin differs", () => {
  const files = { ...pinned("18.6"), ".github/workflows/ci.yml": pinned("18.4")[".github/workflows/ci.yml"] };
  const [failure, ...rest] = checkPostgresPins(files);
  assert.equal(rest.length, 0);
  for (const { path } of PINS) assert.ok(failure.includes(`${path} holds`), `${path} is not named`);
  assert.ok(failure.includes(".github/workflows/ci.yml holds 18.4"));
  assert.ok(failure.includes("postgres/Dockerfile holds 18.6"));
});

test("catches a Dockerfile bumped alone, as Dependabot does", () => {
  const files = { ...pinned("18.6"), "postgres/Dockerfile": "FROM postgres:18.7\n" };
  assert.equal(checkPostgresPins(files).length, 1);
});

test("fails when a file pins no tag it can read, rather than passing on nothing", () => {
  const files = { ...pinned("18.6"), "backend/src/test/java/fi/kalia/DatabaseRolesIT.java": "// no container" };
  assert.match(checkPostgresPins(files)[0], /DatabaseRolesIT\.java pins no Postgres tag/);
});
