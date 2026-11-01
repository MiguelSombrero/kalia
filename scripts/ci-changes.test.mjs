#!/usr/bin/env node
// Self-test for ci-changes.mjs. A rule that is too narrow skips a job CI
// should have run and reads as a pass, so each output is pinned in both
// directions. The base-choosing cases run against throwaway git repositories,
// because the script reads history.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { OUTPUTS, changes, decide } from "./ci-changes.mjs";

const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;
const gitEnv = {
  ...cleanEnv,
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.invalid",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.invalid",
};

const MOBILE_JOBS = ["mobile", "mobile-e2e"];

function expectOutputs(files, expected) {
  const outputs = decide(files);
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(outputs[name], value, `${name} for ${files.join(", ")}`);
  }
}

test("a docs-only change runs neither mobile job", () => {
  expectOutputs(["docs/roadmap.md", "docs/tasks/iteration-10/22-x.md"], { mobile: false, "mobile-e2e": false });
});

test("a web-only change runs web and neither mobile job", () => {
  expectOutputs(["web/src/app/page.tsx"], { web: true, backend: false, mobile: false, "mobile-e2e": false });
});

test("web plus docs/architecture.md runs backend and web, and neither mobile job", () => {
  expectOutputs(["web/src/app/page.tsx", "docs/architecture.md"], {
    backend: true,
    web: true,
    mobile: false,
    "mobile-e2e": false,
  });
});

for (const file of [
  "mobile/app.json",
  "packages/api/src/client.ts",
  "backend/src/main/java/fi/kalia/Application.java",
  "edge/nginx.conf",
  "keycloak/realm-export.json",
  "postgres/init.sql",
  "docker-compose.yml",
  "docker-compose.base.yml",
  "docker-compose.dev.env",
  ".github/workflows/ci.yml",
  "package.json",
  "package-lock.json",
  "Makefile",
  "scripts/mobile-e2e.mjs",
  "scripts/mobile-env.mjs",
  "scripts/stack-ports.mjs",
  "scripts/seed-keycloak-account.mjs",
  "scripts/keycloak-admin.mjs",
]) {
  test(`${file} runs the Android end-to-end job`, () => {
    expectOutputs([file], { "mobile-e2e": true });
  });
}

for (const file of ["web/next.config.ts", "docs/architecture.md", ".node-version", ".dockerignore", "README.md"]) {
  test(`${file} alone does not run the Android end-to-end job`, () => {
    expectOutputs([file], { "mobile-e2e": false });
  });
}

for (const file of [
  "mobile/src/app/index.tsx",
  "packages/locales/src/en.ts",
  "package-lock.json",
  "backend/openapi.json",
  "Makefile",
  "scripts/mobile-env.mjs",
]) {
  test(`${file} runs the mobile job`, () => {
    expectOutputs([file], { mobile: true });
  });
}

for (const file of ["backend/src/main/java/fi/kalia/Application.java", "docs/architecture.md", "docker-compose.yml", "edge/nginx.conf", ".node-version"]) {
  test(`${file} alone does not run the mobile job`, () => {
    expectOutputs([file], { mobile: false });
  });
}

for (const file of [".github/workflows/ci.yml", "scripts/ci-changes.mjs"]) {
  test(`${file} runs everything`, () => {
    expectOutputs([file], Object.fromEntries(OUTPUTS.map((name) => [name, true])));
  });
}

test("the shared root files still run backend and web", () => {
  for (const file of [
    "docs/architecture.md",
    ".node-version",
    ".dockerignore",
    "docker-compose.yml",
    "edge/nginx.conf",
    "keycloak/realm-export.json",
    "postgres/init.sql",
    "scripts/seed-keycloak-account.mjs",
    "scripts/keycloak-admin.mjs",
    ".github/workflows/vulnerability-scan.yml",
  ]) {
    expectOutputs([file], { backend: true, web: true });
  }
});

test("another workflow runs backend, web and keycloak, and neither mobile job", () => {
  expectOutputs([".github/workflows/vulnerability-scan.yml"], {
    backend: true,
    web: true,
    keycloak: true,
    mobile: false,
    "mobile-e2e": false,
  });
});

test("backend, web and keycloak keep their own triggers", () => {
  expectOutputs(["backend/src/main/java/fi/kalia/Application.java"], { backend: true, web: false, keycloak: false });
  expectOutputs(["backend/openapi.json"], { backend: true, web: true });
  expectOutputs(["packages/api/src/client.ts"], { web: true, backend: false });
  expectOutputs(["scripts/check-keycloak-pkce-flow.mjs"], { keycloak: true, backend: false, web: false });
  expectOutputs(["web/src/app/page.tsx"], { keycloak: false });
});

function repo() {
  const root = mkdtempSync(resolve(tmpdir(), "ci-changes-"));
  const run = (...args) =>
    execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd: root, env: gitEnv, encoding: "utf8" }).trim();
  const commit = (files, message = "change") => {
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(resolve(root, dirname(rel)), { recursive: true });
      writeFileSync(resolve(root, rel), content);
    }
    run("add", "-A");
    run("commit", "-q", "-m", message);
    return run("rev-parse", "HEAD");
  };
  run("init", "-q", "-b", "dev");
  commit({ "mobile/app.json": "{}", "docs/roadmap.md": "x" }, "initial");
  return { root, run, commit };
}

function inRepo(body) {
  const fixture = repo();
  try {
    body(fixture);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

const everythingRuns = (result) => assert.ok(OUTPUTS.every((name) => result.outputs[name]), result.reason);

for (const [kind, files] of [
  ["docs-only", { "docs/roadmap.md": "y" }],
  ["web-only", { "web/src/app/page.tsx": "y" }],
  ["web plus docs/architecture.md", { "web/src/app/page.tsx": "y", "docs/architecture.md": "y" }],
]) {
  test(`a push to dev whose diff is ${kind} skips both mobile jobs`, () => {
    inRepo(({ root, commit }) => {
      const before = commit({ "mobile/app.json": '{"v":1}' });
      commit(files);
      const result = changes({ cwd: root, refName: "dev", before, devRef: "dev" });
      assert.deepEqual(result.files.sort(), Object.keys(files).sort());
      for (const name of MOBILE_JOBS) assert.equal(result.outputs[name], false, name);
    });
  });
}

test("a push to dev that changes mobile/ runs the Android end-to-end job", () => {
  inRepo(({ root, commit }) => {
    const before = commit({ "docs/roadmap.md": "y" });
    commit({ "mobile/app.json": '{"v":2}' });
    assert.equal(changes({ cwd: root, refName: "dev", before, devRef: "dev" }).outputs["mobile-e2e"], true);
  });
});

test("a push to dev whose previous commit is not in the repository runs everything", () => {
  inRepo(({ root, commit }) => {
    commit({ "docs/roadmap.md": "y" });
    everythingRuns(changes({ cwd: root, refName: "dev", before: "1234567890abcdef1234567890abcdef12345678", devRef: "dev" }));
  });
});

test("a forced push to dev, whose previous commit is no ancestor, runs everything", () => {
  inRepo(({ root, run, commit }) => {
    const base = run("rev-parse", "HEAD");
    const before = commit({ "mobile/app.json": '{"v":3}' });
    run("reset", "-q", "--hard", base);
    commit({ "docs/roadmap.md": "z" });
    everythingRuns(changes({ cwd: root, refName: "dev", before, devRef: "dev" }));
  });
});

test("a first push to dev, or a dispatch with no previous commit, runs everything", () => {
  inRepo(({ root, commit }) => {
    commit({ "docs/roadmap.md": "y" });
    everythingRuns(changes({ cwd: root, refName: "dev", before: "0000000000000000000000000000000000000000", devRef: "dev" }));
    everythingRuns(changes({ cwd: root, refName: "dev", before: "", devRef: "dev" }));
  });
});

test("a push to main runs everything", () => {
  inRepo(({ root, run, commit }) => {
    const before = run("rev-parse", "HEAD");
    commit({ "docs/roadmap.md": "y" });
    everythingRuns(changes({ cwd: root, refName: "main", before, devRef: "dev" }));
  });
});

test("a branch is compared with its merge base, so a docs-only branch skips both mobile jobs", () => {
  inRepo(({ root, run, commit }) => {
    run("checkout", "-q", "-b", "docs/topic");
    commit({ "docs/roadmap.md": "y" });
    commit({ "docs/architecture.md": "y" });
    const result = changes({ cwd: root, refName: "docs/topic", devRef: "dev" });
    assert.deepEqual(result.files.sort(), ["docs/architecture.md", "docs/roadmap.md"]);
    for (const name of MOBILE_JOBS) assert.equal(result.outputs[name], false, name);
  });
});

test("a branch with no commit of its own, or no dev to compare with, runs everything", () => {
  inRepo(({ root, run }) => {
    run("checkout", "-q", "-b", "empty");
    everythingRuns(changes({ cwd: root, refName: "empty", devRef: "dev" }));
    everythingRuns(changes({ cwd: root, refName: "empty", devRef: "origin/dev" }));
  });
});

test("a path with non-ASCII characters is matched as written", () => {
  inRepo(({ root, run, commit }) => {
    run("checkout", "-q", "-b", "unicode");
    commit({ "mobile/assets/öl.txt": "x" });
    const result = changes({ cwd: root, refName: "unicode", devRef: "dev" });
    assert.deepEqual(result.files, ["mobile/assets/öl.txt"]);
    assert.equal(result.outputs.mobile, true);
  });
});

test("a file moved out of mobile/ counts as a change to mobile/", () => {
  inRepo(({ root, run }) => {
    run("checkout", "-q", "-b", "move");
    mkdirSync(resolve(root, "docs/moved"), { recursive: true });
    renameSync(resolve(root, "mobile/app.json"), resolve(root, "docs/moved/app.json"));
    run("add", "-A");
    run("commit", "-q", "-m", "move");
    const result = changes({ cwd: root, refName: "move", devRef: "dev" });
    assert.equal(result.outputs.mobile, true, result.files.join(", "));
  });
});
