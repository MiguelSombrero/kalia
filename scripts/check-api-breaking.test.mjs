#!/usr/bin/env node
// Self-test for check-api-breaking.mjs's waiver rules. The committed waiver
// file is empty, so the validator never has anything to refuse there and would
// stay green if it stopped looking.

import test from "node:test";
import assert from "node:assert/strict";

import { problemsInWaivers } from "./check-api-breaking.mjs";

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
