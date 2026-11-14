// Self-test for wait-for.mjs. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { EXIT, MAX_TIMEOUT_SECONDS, failMatcher, lastLines, waitFor } from "./wait-for.mjs";

const SCRIPT = fileURLToPath(new URL("./wait-for.mjs", import.meta.url));
const wait = (...args) => spawnSync("node", [SCRIPT, ...args], { encoding: "utf8" });
const sh = (script) => ["--", "sh", "-c", script];

test("a probe that succeeds is ready, and its last lines are printed", () => {
  const { status, stdout } = wait("--timeout", "5", "--interval", "0.1", ...sh("echo one; echo two"));
  assert.equal(status, EXIT.ready);
  assert.match(stdout, /ready\none\ntwo/);
});

test("a probe that never succeeds ends at the ceiling with a non-zero exit and its last output", () => {
  const started = Date.now();
  const { status, stderr } = wait("--timeout", "1", "--interval", "0.2", ...sh("echo still starting; exit 1"));
  assert.equal(status, EXIT.timeout);
  assert.match(stderr, /timed out after 1 s/);
  assert.match(stderr, /still starting/);
  assert.ok(Date.now() - started < 4000, "the wait is bounded by --timeout");
});

test("failure text ends the wait at once, not at the ceiling", () => {
  const started = Date.now();
  const { status, stderr } = wait("--timeout", "30", "--interval", "0.1", "--fail", "BUILD FAILED|error:", ...sh("echo 'BUILD FAILED'; exit 1"));
  assert.equal(status, EXIT.failed);
  assert.match(stderr, /failed \(output matched/);
  assert.match(stderr, /BUILD FAILED/);
  assert.ok(Date.now() - started < 5000);
});

test("failure text wins over a probe that also succeeds", () => {
  const { status } = wait("--timeout", "5", "--fail", "FAILED", ...sh("echo FAILED"));
  assert.equal(status, EXIT.failed);
});

test("the wait cannot be unbounded: --timeout is required and capped", () => {
  for (const args of [[], ["--timeout", "0"], ["--timeout", String(MAX_TIMEOUT_SECONDS + 1)]]) {
    const { status, stderr } = wait(...args, ...sh("true"));
    assert.equal(status, EXIT.usage);
    assert.match(stderr, /--timeout/);
  }
});

test("a missing probe command is a usage error", () => {
  assert.equal(wait("--timeout", "5").status, EXIT.usage);
});

test("--fail is literal text with | between alternatives, never a regular expression", () => {
  const { test: matches } = failMatcher("BUILD FAILED|error: (");
  assert.equal(matches("... BUILD FAILED ..."), true);
  assert.equal(matches("error: (x"), true);
  assert.equal(matches("BUILD SUCCEEDED, 0 errors"), false);
  assert.equal(failMatcher("a.c").test("abc"), false, "a dot is a dot");
  assert.equal(wait("--timeout", "5", "--fail", "(", ...sh("echo '('")).status, EXIT.failed);
});

test("only the last lines of output are kept, blank ones dropped", () => {
  assert.equal(lastLines("a\n\nb\nc\nd\n", 2), "c\nd");
});

test("a thing that has already ended fails the wait without waiting out the ceiling", async () => {
  const result = await waitFor({ probe: () => ({ ok: false, output: "" }), timeoutMs: 60_000, intervalMs: 10, died: () => "it exited" });
  assert.deepEqual([result.outcome, result.reason], ["failed", "it exited"]);
});

test("an interval longer than the ceiling still probes up to the ceiling, not once", async () => {
  let probes = 0;
  const result = await waitFor({ probe: () => ({ ok: ++probes === 2, output: "" }), timeoutMs: 300, intervalMs: 5000 });
  assert.equal(result.outcome, "ready");
});
