#!/usr/bin/env node
// Self-test for retry-registry.mjs: each registry signature is retried, any
// other failure is not, and the real process path passes the command's exit
// status and output through.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ATTEMPTS, main, registrySignature, retryOnRegistryFailure, runCommand } from "./retry-registry.mjs";

const FAILURES = {
  "a parent POM Maven Central did not serve":
    "[ERROR] Non-resolvable parent POM for com.kalia:backend:0.0.1: Could not transfer artifact org.springframework.boot:spring-boot-starter-parent:pom:4.0.0",
  "an artifact Maven could not transfer":
    "[ERROR] Failed to execute goal on project backend: Could not transfer artifact org.apache.maven.plugins:maven-compiler-plugin:pom:3.14.0 from/to central",
  "a 503 from quay.io": "failed to resolve source metadata for quay.io/keycloak/keycloak:26.8.2-0: unexpected status from HEAD request: 503 Service Unavailable",
  "a 502 from Docker Hub": "error pulling image configuration: download failed after attempts=1: 502 Bad Gateway",
  "an unexpected status code": "Unable to initialize the Java DB: unexpected status code 504",
  "a Maven transfer status": "Transfer failed ... status: 503 ... Return code is: 502, ReasonPhrase: Bad Gateway.",
  "a connection reset by the peer": "read tcp 10.0.0.2:44112->104.18.122.25:443: read: connection reset by peer",
  "a reset connection in Node's words": "Error: read ECONNRESET",
  "a TLS handshake timeout": "Error response from daemon: Get \"https://registry-1.docker.io/v2/\": net/http: TLS handshake timeout",
  "a dropped transfer": "error pulling image configuration: unexpected EOF",
};

const NOT_REGISTRY = {
  "a compile error": "[ERROR] /app/src/main/java/com/kalia/Beer.java:[12,8] cannot find symbol\n[ERROR] BUILD FAILURE",
  "a compile error that mentions a number": "[ERROR] Beer.java:[500,12] error: ';' expected",
  "a failed test": "Tests run: 52, Failures: 1, Errors: 0\n[ERROR] BeerServiceTest.rejectsBlankName:48 expected: <400> but was: <500>",
  "a missing image": "pull access denied for kalia/missing, repository does not exist or may require 'docker login'",
  "a finding": "Total: 1 (HIGH: 1, CRITICAL: 0)",
  "a test's own status": "expected exit status 500 but was 1",
  "a 404": "unexpected status code 404 Not Found",
  "a Dockerfile typo": "failed to solve: dockerfile parse error on line 3: unknown instruction: RUNN",
  nothing: "",
};

for (const [what, output] of Object.entries(FAILURES)) {
  test(`${what} is a registry failure`, () => {
    assert.ok(registrySignature(output));
  });
}

for (const [what, output] of Object.entries(NOT_REGISTRY)) {
  test(`${what} is not a registry failure`, () => {
    assert.equal(registrySignature(output), undefined);
  });
}

/** An `run` that answers with each result in turn, counting how often it was asked. */
const scripted = (...results) => {
  const calls = [];
  const run = async () => {
    const next = results[Math.min(calls.length, results.length - 1)];
    calls.push(next);
    return next;
  };
  return { run, calls };
};

const quiet = () => {
  const waits = [];
  const lines = [];
  return { sleep: async (seconds) => void waits.push(seconds), log: (line) => void lines.push(line), waits, lines };
};

for (const [what, output] of Object.entries(FAILURES)) {
  test(`${what} is retried, and a later success passes`, async () => {
    const attempts = scripted({ status: 1, output }, { status: 0, output: "built" });
    const io = quiet();
    assert.equal(await retryOnRegistryFailure({ run: attempts.run, ...io }), 0);
    assert.equal(attempts.calls.length, 2);
    assert.deepEqual(io.waits, [15]);
  });
}

for (const [what, output] of Object.entries(NOT_REGISTRY)) {
  test(`${what} fails at once, with its own exit status`, async () => {
    const attempts = scripted({ status: 17, output });
    const io = quiet();
    assert.equal(await retryOnRegistryFailure({ run: attempts.run, ...io }), 17);
    assert.equal(attempts.calls.length, 1);
    assert.deepEqual(io.waits, []);
  });
}

test("a registry failure that never clears fails after the attempts, with the last exit status", async () => {
  const attempts = scripted({ status: 1, output: FAILURES["a 503 from quay.io"] }, { status: 1, output: FAILURES["a 503 from quay.io"] }, { status: 9, output: FAILURES["a 503 from quay.io"] });
  const io = quiet();
  assert.equal(await retryOnRegistryFailure({ run: attempts.run, ...io }), 9);
  assert.equal(attempts.calls.length, ATTEMPTS);
  assert.deepEqual(io.waits, [15, 30]);
  assert.match(io.lines.at(-1), /^::error::.*outlasted 3 attempts/);
});

test("a registry failure followed by a compile error stops at the compile error", async () => {
  const attempts = scripted({ status: 1, output: FAILURES["a parent POM Maven Central did not serve"] }, { status: 1, output: NOT_REGISTRY["a compile error"] });
  const io = quiet();
  assert.equal(await retryOnRegistryFailure({ run: attempts.run, ...io }), 1);
  assert.equal(attempts.calls.length, 2);
});

test("a command that succeeds the first time runs once and is never waited on", async () => {
  const attempts = scripted({ status: 0, output: "Non-resolvable parent POM, but it worked the second time" });
  const io = quiet();
  assert.equal(await retryOnRegistryFailure({ run: attempts.run, ...io }), 0);
  assert.equal(attempts.calls.length, 1);
});

test("runCommand reports a child's exit status and what it printed to both streams", async () => {
  const result = await runCommand([process.execPath, "-e", "console.log('to stdout'); console.error('to stderr'); process.exit(3)"]);
  assert.equal(result.status, 3);
  assert.match(result.output, /to stdout/);
  assert.match(result.output, /to stderr/);
});

test("runCommand reports a command that does not exist as a failure", async () => {
  const result = await runCommand(["kalia-no-such-command"]);
  assert.equal(result.status, 127);
});

test("a real command that fails on a registry signature is run again, then passes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "retry-registry-"));
  try {
    const counter = join(dir, "count");
    writeFileSync(counter, "0");
    const script = `
      const fs = require("node:fs");
      const count = Number(fs.readFileSync(${JSON.stringify(counter)}, "utf8")) + 1;
      fs.writeFileSync(${JSON.stringify(counter)}, String(count));
      if (count < 2) { console.error("Could not transfer artifact"); process.exit(1); }
    `;
    // Waiting 15 s in a test is waiting for nothing: the retry loop's own wait is exercised above.
    const result = await retryOnRegistryFailure({
      run: () => runCommand([process.execPath, "-e", script]),
      sleep: async () => {},
      log: () => {},
    });
    assert.equal(result, 0);
    assert.equal(readFileSync(counter, "utf8"), "2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("main without a command prints usage and exits 2", async () => {
  assert.equal(await main([]), 2);
  assert.equal(await main(["docker", "pull", "x"]), 2);
});

test("main passes a command's failure through without retrying a compile error", async () => {
  assert.equal(await main(["--", process.execPath, "-e", "console.error('BUILD FAILURE'); process.exit(4)"]), 4);
});
