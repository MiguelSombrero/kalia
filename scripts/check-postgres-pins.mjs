#!/usr/bin/env node
// Fails when the Postgres tag is not the same in every file that pins it.
// Dependabot bumps `postgres/Dockerfile` and the compose files, in separate
// pull requests, and cannot see the Testcontainers tests or CI's pre-pull, so
// nothing else keeps the six in step: a built image would carry one tag and
// hold another, and the backend's tests would run on a Postgres the stack does
// not. Runs in `make check`.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DOCKERFILE = /^\s*FROM\s+postgres:(\S+)/gm;
const COMPOSE = /^\s*image:\s*postgres:(\S+)/gm;
const TESTCONTAINERS = /DockerImageName\.parse\("postgres:([^"]+)"\)/g;
const PRE_PULL = /docker pull postgres:(\S+)/g;

export const PINS = [
  { path: "postgres/Dockerfile", pattern: DOCKERFILE },
  { path: "docker-compose.base.yml", pattern: COMPOSE },
  { path: "docker-compose.override.yml", pattern: COMPOSE },
  { path: "backend/src/test/java/fi/kalia/TestcontainersConfiguration.java", pattern: TESTCONTAINERS },
  { path: "backend/src/test/java/fi/kalia/DatabaseRolesIT.java", pattern: TESTCONTAINERS },
  { path: ".github/workflows/ci.yml", pattern: PRE_PULL },
];

/**
 * @param {Record<string, string>} contents each pinning file's text, by its path in PINS
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkPostgresPins(contents) {
  const failures = [];
  const found = [];
  for (const { path, pattern } of PINS) {
    const tags = [...contents[path].matchAll(pattern)].map((match) => match[1]);
    if (tags.length === 0) failures.push(`${path} pins no Postgres tag this check can read; update PINS in scripts/check-postgres-pins.mjs`);
    for (const tag of tags) found.push({ path, tag });
  }
  if (new Set(found.map(({ tag }) => tag)).size > 1) {
    failures.push(`the Postgres tag differs between files: ${found.map(({ path, tag }) => `${path} holds ${tag}`).join(", ")}`);
  }
  return failures;
}

const invokedDirectly =
  import.meta.main ?? (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const contents = Object.fromEntries(PINS.map(({ path }) => [path, readFileSync(resolve(ROOT, path), "utf8")]));
  const failures = checkPostgresPins(contents);
  console.log(`Checking that ${PINS.length} files pin the same Postgres tag\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
