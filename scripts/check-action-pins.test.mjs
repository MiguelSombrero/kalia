#!/usr/bin/env node
// Self-test for check-action-pins.mjs, with GitHub stubbed: every pin in the
// tree exists, so the check never fires there and would stay green if it
// stopped looking.

import test from "node:test";
import assert from "node:assert/strict";

import { commitExists, missingPins, pinsIn } from "./check-action-pins.mjs";

const REAL = "3d3c42e5aac5ba805825da76410c181273ba90b1";
const INVENTED = "0123456789abcdef0123456789abcdef01234567";

const workflow = [
  "jobs:",
  "  build:",
  "    steps:",
  `      - uses: actions/checkout@${REAL} # v7.0.1`,
  "      - name: Scan",
  `        uses: aquasecurity/trivy-action@${INVENTED} # v0.99.0`,
  "      - uses: ./.github/actions/local",
  "      - uses: actions/setup-node@v7",
  `      - uses: github/codeql-action/init@${REAL}`,
  "  call:",
  "    uses: ./.github/workflows/vulnerability-scan.yml",
].join("\n");

const github = (known) => async (action, sha) => known.has(`${action}@${sha}`);

test("reads each step pinned to a SHA, with its line, and skips local and tag references", () => {
  assert.deepEqual(pinsIn(workflow), [
    { action: "actions/checkout", sha: REAL, line: 4 },
    { action: "aquasecurity/trivy-action", sha: INVENTED, line: 6 },
    { action: "github/codeql-action", sha: REAL, line: 9 },
  ]);
});

test("fails a workflow that pins a SHA its repository does not have, naming file and line", async () => {
  const known = new Set([`actions/checkout@${REAL}`, `github/codeql-action@${REAL}`]);
  assert.deepEqual(await missingPins([{ file: ".github/workflows/ci.yml", text: workflow }], github(known)), [
    `.github/workflows/ci.yml:6 pins aquasecurity/trivy-action to ${INVENTED}, a commit that repository does not have`,
  ]);
});

test("passes when every pin exists, asking once per distinct pin", async () => {
  const asked = [];
  const exists = async (action, sha) => {
    asked.push(`${action}@${sha}`);
    return true;
  };
  const text = `${workflow}\n      - uses: actions/checkout@${REAL}`;
  assert.deepEqual(await missingPins([{ file: "a.yml", text }, { file: "b.yml", text }], exists), []);
  assert.equal(asked.length, 3);
});

const answering = (status) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { status };
  };
  return { calls, fetchImpl };
};

test("asks GitHub for the commit in that repository, with the token when there is one", async () => {
  const { calls, fetchImpl } = answering(200);
  assert.equal(await commitExists("actions/checkout", REAL, fetchImpl, "t0ken"), true);
  assert.equal(calls[0].url, `https://api.github.com/repos/actions/checkout/commits/${REAL}`);
  assert.equal(calls[0].init.headers.Authorization, "Bearer t0ken");
  await commitExists("actions/checkout", REAL, fetchImpl, undefined);
  assert.equal(calls[1].init.headers.Authorization, undefined);
});

test("reads 404 and 422 as a missing commit, and refuses to guess on anything else", async () => {
  assert.equal(await commitExists("a/b", INVENTED, answering(404).fetchImpl, undefined), false);
  assert.equal(await commitExists("a/b", INVENTED, answering(422).fetchImpl, undefined), false);
  await assert.rejects(commitExists("a/b", INVENTED, answering(403).fetchImpl, undefined), /answered 403 .* could not be checked/);
});
