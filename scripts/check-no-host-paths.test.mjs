#!/usr/bin/env node
// Fixture self-test for check-no-host-paths.mjs. The real tree holds no host
// path, so the check never fires there and would stay green even if it stopped
// looking. Fixture paths are assembled from parts so this file holds none
// either and the checker passes over it.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkTrackedFiles, findHostPaths } from "./check-no-host-paths.mjs";

const unix = (...parts) => ["", ...parts].join("/");

const HOST = {
  "a macOS home directory": unix("Users", "alice", "Projects", "kalia"),
  "a Linux home directory": unix("home", "alice", "kalia"),
  "a Windows home directory": ["C:", "Users", "alice", "kalia"].join("\\"),
  "a macOS temporary directory": unix("private", "tmp", "claude-501", "scratchpad"),
};

test("passes repository-relative paths, URLs and the CI runner's home", () => {
  const text = [
    "see docs/adr/0046-edit-time-checks-and-one-verify-gate.md",
    "https://github.com/MiguelSombrero/kalia/home/x",
    "https://api.github.com/Users/octocat",
    `at ${unix("home", "runner", "work", "kalia", "kalia", "Makefile")}:12`,
    "~/.claude/settings.json",
    "a scratch file in /tmp/out.txt",
  ].join("\n");
  assert.deepEqual(findHostPaths("body.md", text), []);
});

test("fails each kind of host path, naming file, line and kind", () => {
  for (const [kind, path] of Object.entries(HOST)) {
    const failures = findHostPaths("body.md", `intro\n- **Where:** \`${path}\``);
    assert.deepEqual(failures, [`body.md:2 holds ${kind}`], kind);
  }
});

test("never echoes the path it found", () => {
  for (const path of Object.values(HOST)) {
    for (const failure of findHostPaths("body.md", path)) assert.doesNotMatch(failure, /alice/);
  }
});

test("catches a file URL", () => {
  assert.equal(findHostPaths("x.md", `file://${HOST["a macOS home directory"]}`).length, 1);
});

// A hook exports GIT_DIR and friends; a fixture git call that inherits them
// acts on the real repository instead of the temp one.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

test("reads tracked text files only", () => {
  const root = mkdtempSync(resolve(tmpdir(), "host-path-check-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root, env: cleanEnv });
    writeFileSync(resolve(root, "tracked.md"), `ok\n${HOST["a macOS home directory"]}\n`);
    writeFileSync(resolve(root, "binary.bin"), `\0${HOST["a macOS home directory"]}`);
    writeFileSync(resolve(root, "untracked.md"), HOST["a macOS home directory"]);
    execFileSync("git", ["add", "tracked.md", "binary.bin"], { cwd: root, env: cleanEnv });
    assert.deepEqual(checkTrackedFiles(root), ["tracked.md:2 holds a macOS home directory"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
