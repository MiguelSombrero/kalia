#!/usr/bin/env node
// Self-test for check-api-breaking.mjs's waiver rules and its stale-branch
// advice. The committed waiver file is empty, so the validator never has
// anything to refuse there and would stay green if it stopped looking.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { baseChangedSpecSinceFork, blockingFindings, failureReport, problemsInWaivers, staleBranchAdvice } from "./check-api-breaking.mjs";

const removal = "GET /api/v1/styles api path removed with deprecation [api-path-removed-with-deprecation]";

test("an empty file and a file of comments waive nothing and pass", () => {
  assert.deepEqual(problemsInWaivers(""), []);
  assert.deepEqual(problemsInWaivers("# only\n\n# comments\n"), []);
});

test("a deprecated removal passes when the line above states the build", () => {
  assert.deepEqual(problemsInWaivers(`# minimum supported build 14 excludes it\n${removal}\n`), []);
});

test("a deprecated removal with no build stated fails", () => {
  const [problem] = problemsInWaivers(`${removal}\n`);
  assert.match(problem, /openapi-breaking-ignore\.txt:1: .*minimum supported build N/);
  assert.equal(problemsInWaivers(`# it is old\n${removal}\n`).length, 1);
});

test("a build stated for another entry does not cover this one", () => {
  const text = `# minimum supported build 14 excludes it\n${removal}\n${removal.replace("styles", "countries")}\n`;
  const problems = problemsInWaivers(text);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /:3: /);
});

test("a removal of something never deprecated cannot be waived", () => {
  const unwaivable = "GET /api/v1/styles api path removed without deprecation [api-path-removed-without-deprecation]";
  const [problem] = problemsInWaivers(`# minimum supported build 14 excludes it\n${unwaivable}\n`);
  assert.match(problem, /only the removal of a deprecated element can be waived/);
});

test("a response property removal cannot be waived", () => {
  const property = "POST /api/v1/beers removed the required property `name` from the response [response-required-property-removed]";
  assert.equal(problemsInWaivers(`# minimum supported build 14 excludes it\n${property}\n`).length, 1);
});

const oneOfAdded = (status) => ({
  id: "response-body-one-of-added",
  text: `added \`#/components/schemas/PendingElsewhereProblem\` to the response body \`oneOf\` list for the response status \`${status}\``,
  level: 3,
});

test("a oneOf member added to an error response does not fail", () => {
  for (const status of ["400", "409", "429", "500"]) {
    assert.deepEqual(blockingFindings([oneOfAdded(status)]), [], status);
  }
});

test("a oneOf member added to a 2xx response still fails", () => {
  for (const status of ["200", "201"]) {
    assert.equal(blockingFindings([oneOfAdded(status)]).length, 1, status);
  }
});

test("nothing else about an error response is let through", () => {
  const removed = { id: "response-body-one-of-removed", text: oneOfAdded("409").text, level: 3 };
  const property = { id: "response-required-property-removed", text: "removed the required property `title`", level: 3 };
  assert.equal(blockingFindings([removed, property, oneOfAdded("409")]).length, 2);
});

test("a finding below error level never fails", () => {
  assert.deepEqual(blockingFindings([{ ...oneOfAdded("200"), level: 2 }]), []);
});

// A hook exports GIT_DIR and friends; a fixture git call that inherits them
// acts on the real repository instead of the temp one.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

const cellarFinding = {
  operation: "GET",
  path: "/api/v1/cellar",
  text: "removed the required property items/withdrawn",
  id: "response-required-property-removed",
};

test("a passing check asks nothing about the branch and prints nothing", () => {
  assert.deepEqual(failureReport([], "origin/dev", () => assert.fail("asked")), []);
});

const fixtureRepo = () => {
  const root = mkdtempSync(join(tmpdir(), "api-breaking-fork-"));
  const env = { ...cleanEnv, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
  const git = (...args) => execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd: root, env, stdio: "ignore" });
  const commitSpec = (text, message) => {
    writeFileSync(join(root, "backend", "openapi.json"), text);
    git("add", "-A");
    git("commit", "-q", "-m", message);
  };
  mkdirSync(join(root, "backend"));
  git("init", "-q", "-b", "dev");
  commitSpec('{"v":1}', "spec v1");
  return { root, env, git, commitSpec };
};

test("a branch cut before dev changed the spec is told to merge dev in", () => {
  const { root, env, git, commitSpec } = fixtureRepo();
  try {
    git("switch", "-q", "-c", "feature");
    git("switch", "-q", "dev");
    commitSpec('{"v":2}', "dev changes the spec");
    git("switch", "-q", "feature");
    assert.equal(baseChangedSpecSinceFork("dev", root, env), true);
    const lines = failureReport([cellarFinding], "origin/dev", () => baseChangedSpecSinceFork("dev", root, env));
    assert.equal(lines[0], "  FAIL  GET /api/v1/cellar removed the required property items/withdrawn [response-required-property-removed]");
    assert.match(lines.at(-1), /has changed backend\/openapi\.json since this branch was cut .*merge it in \(git merge origin\/dev\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a branch cut after dev's last spec change gets no advice to merge", () => {
  const { root, env, git, commitSpec } = fixtureRepo();
  try {
    commitSpec('{"v":2}', "dev changes the spec");
    git("switch", "-q", "-c", "feature");
    commitSpec('{"v":3}', "the branch changes it again");
    assert.equal(baseChangedSpecSinceFork("dev", root, env), false);
    assert.equal(baseChangedSpecSinceFork("no-such-ref", root, env), false);
    assert.deepEqual(failureReport([cellarFinding], "dev", () => baseChangedSpecSinceFork("dev", root, env)).length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
