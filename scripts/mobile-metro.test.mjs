// Self-test for mobile-metro.mjs: starts real detached processes, with a node
// one-liner standing in for Metro. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { down, isRunning, ownMetro, readState, startTimeOf, up } from "./mobile-metro.mjs";

const freePort = () =>
  new Promise((resolve) => {
    // On loopback, where the stand-in listens, so a port another process holds there is never picked.
    const server = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

const FAKE_METRO = `require("http").createServer((_, res) => res.end("packager-status:running")).listen(Number(process.env.RCT_METRO_PORT), "127.0.0.1")`;

const scratch = () => mkdtempSync(join(tmpdir(), "kalia-metro-test-"));
const gone = async (state) => {
  for (let k = 0; k < 50 && startTimeOf(state.pid) === state.started; k++) await new Promise((done) => setTimeout(done, 100));
  return startTimeOf(state.pid) !== state.started;
};

test("only the exact status text counts as running", () => {
  assert.equal(isRunning("packager-status:running"), true);
  assert.equal(isRunning("packager-status:stopped"), false);
  assert.equal(isRunning(""), false);
});

test("up returns once Metro answers, and down stops that Metro and no other", async () => {
  const dir = scratch();
  const port = await freePort();
  const stack = { METRO_PORT: String(port) };
  try {
    const started = await up({ stack, dir, command: "node", commandArgs: ["-e", FAKE_METRO], env: { ...process.env, RCT_METRO_PORT: String(port) }, intervalMs: 50 });
    assert.equal(started.ok, true, started.message);
    const state = readState(dir);
    assert.equal(Number(state.port), port);
    assert.ok(ownMetro(state), "the recorded process is alive and ours");

    const again = await up({ stack, dir, command: "node", commandArgs: ["-e", "process.exit(9)"], intervalMs: 50 });
    assert.equal(again.ok, true, "a second up reuses the running Metro instead of starting another");
    assert.equal(readState(dir).pid, state.pid);

    assert.equal((await down({ dir })).ok, true);
    assert.ok(await gone(state), "the process group is stopped");
    assert.match((await down({ dir })).message, /No Metro/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Metro that never answers is stopped at the ceiling, with a non-zero result naming the wait and the log", async () => {
  const dir = scratch();
  const port = await freePort();
  try {
    const started = Date.now();
    const result = await up({
      stack: { METRO_PORT: String(port) },
      dir,
      command: "node",
      commandArgs: ["-e", "console.log('bundler warming up'); setInterval(() => {}, 1000)"],
      timeoutMs: 1500,
      intervalMs: 100,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /within 1\.5 s/);
    assert.match(result.message, /bundler warming up/);
    assert.ok(Date.now() - started < 8000);
    assert.equal(readState(dir), undefined, "no pid file is left for a Metro that was stopped");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a Metro that exits fails the wait at once with its log, long before the ceiling", async () => {
  const dir = scratch();
  const port = await freePort();
  try {
    const started = Date.now();
    const result = await up({
      stack: { METRO_PORT: String(port) },
      dir,
      command: "node",
      commandArgs: ["-e", "console.error('Port is in use'); process.exit(1)"],
      timeoutMs: 60_000,
      intervalMs: 100,
    });
    assert.equal(result.ok, false);
    assert.match(result.message, /Port is in use/);
    assert.ok(Date.now() - started < 10_000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a pid file whose process is gone is not trusted, so a recycled pid is never signalled", () => {
  assert.equal(ownMetro({ pid: process.pid, started: "Mon Jan  1 00:00:00 2001" }), undefined);
  assert.equal(ownMetro({ pid: process.pid, started: startTimeOf(process.pid) })?.pid, process.pid);
  assert.equal(ownMetro(undefined), undefined);
});
