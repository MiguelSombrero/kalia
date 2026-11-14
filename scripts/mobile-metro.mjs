#!/usr/bin/env node
// Starts and stops this worktree's Metro without ever holding a terminal:
//   node scripts/mobile-metro.mjs up [expo start flags]   (`make mobile-metro-up`)
//   node scripts/mobile-metro.mjs down                    (`make mobile-metro-down`)
// `up` starts Metro detached on this worktree's METRO_PORT, with the origins
// the app reads, and exits 0 only once Metro's /status answers
// `packager-status:running`; it exits non-zero, naming why and printing the
// log's tail, when Metro exits first or WAIT_SECONDS pass. `down` stops the
// Metro `up` started and nothing else: the pid file under the gitignored
// .local/ names it, with the process's start time so a recycled pid is never
// signalled. A foreground `make mobile-start` blocks its caller for as long as
// it runs, which an agent's tool call cannot survive (mobile/README.md,
// "Waiting on a background command").

import { execFileSync, spawn } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { mobileEnv } from "./mobile-env.mjs";
import { metroArgs } from "./phone-mode.mjs";
import { ROOT, portOf, stackEnv } from "./stack-ports.mjs";
import { lastLines, waitFor } from "./wait-for.mjs";

// `CI=1` starts Metro with reloads disabled, so an edit never reaches the app (docs/common-failures.md).
const withoutCi = ({ CI: _ci, ...rest }) => rest;

export const WAIT_SECONDS = 120;
export const STATE_DIR = resolve(ROOT, ".local");

const files = (dir) => ({ state: resolve(dir, "metro.json"), log: resolve(dir, "metro.log") });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export const isRunning = (text) => text.trim() === "packager-status:running";

export const statusOf = async (port) => {
  try {
    const response = await fetch(`http://localhost:${port}/status`, { signal: AbortSignal.timeout(1500) });
    return { running: isRunning(await response.text()) };
  } catch {
    return { running: false };
  }
};

// A process that is gone, or a zombie, has no start time to match.
export const startTimeOf = (pid) => {
  try {
    const [stat, ...start] = execFileSync("ps", ["-o", "stat=,lstart=", "-p", String(pid)], { encoding: "utf8", env: { ...process.env, LC_ALL: "C" } })
      .trim()
      .split(/\s+/);
    return stat && !stat.startsWith("Z") ? start.join(" ") : undefined;
  } catch {
    return undefined;
  }
};

export const readState = (dir) => {
  try {
    return JSON.parse(readFileSync(files(dir).state, "utf8"));
  } catch {
    return undefined;
  }
};

// The recorded Metro is ours only while a process with that pid and that start time is still alive.
export const ownMetro = (state) => (state && startTimeOf(state.pid) === state.started ? state : undefined);

const logTail = (dir) => {
  try {
    return lastLines(readFileSync(files(dir).log, "utf8"), 20);
  } catch {
    return "";
  }
};

const signalGroup = (pid, signal) => {
  try {
    process.kill(-pid, signal);
  } catch {
    // Already gone.
  }
};

export const stopGroup = async (state, graceMs = 10_000) => {
  signalGroup(state.pid, "SIGTERM");
  for (let waited = 0; waited < graceMs && startTimeOf(state.pid) === state.started; waited += 200) await sleep(200);
  if (startTimeOf(state.pid) === state.started) signalGroup(state.pid, "SIGKILL");
};

/**
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export const up = async ({
  stack = stackEnv(),
  args = [],
  dir = STATE_DIR,
  timeoutMs = WAIT_SECONDS * 1000,
  intervalMs = 1000,
  command = "npm",
  commandArgs = ["start", "--workspace", "mobile", "--", ...metroArgs(stack), ...args],
  env = { ...withoutCi(process.env), ...mobileEnv(stack) },
} = {}) => {
  const port = portOf(stack, "METRO_PORT");
  const { state: stateFile, log } = files(dir);
  let state = ownMetro(readState(dir));
  if (state && String(state.port) !== String(port)) {
    // METRO_PORT changed since it started: that Metro is ours, but not the one asked for.
    await stopGroup(state);
    state = undefined;
  }
  if (!state) {
    if ((await statusOf(port)).running) {
      return { ok: true, message: `Metro already answers on port ${port}; it was not started by this command, so \`make mobile-metro-down\` leaves it alone.` };
    }
    mkdirSync(dir, { recursive: true });
    const out = openSync(log, "w");
    const child = spawn(command, commandArgs, { cwd: ROOT, env, detached: true, stdio: ["ignore", out, out] });
    closeSync(out);
    child.unref();
    child.on("error", () => {});
    state = { pid: child.pid, port, started: undefined };
    for (let k = 0; k < 25 && !state.started; k++) {
      state.started = startTimeOf(child.pid);
      if (!state.started) await sleep(40);
    }
    if (!state.started) {
      return { ok: false, message: `Metro did not start (\`${command}\` exited at once).\n${logTail(dir)}` };
    }
    writeFileSync(stateFile, JSON.stringify(state));
  }
  const result = await waitFor({
    probe: async () => ({ ok: (await statusOf(port)).running, output: "" }),
    timeoutMs,
    intervalMs,
    died: () => (startTimeOf(state.pid) === state.started ? undefined : "Metro exited before it answered"),
  });
  if (result.outcome === "ready") return { ok: true, message: `Metro is up on port ${port} (log: .local/metro.log); stop it with \`make mobile-metro-down\`.` };
  if (result.outcome === "timeout") await stopGroup(state);
  rmSync(stateFile, { force: true });
  const why = result.outcome === "timeout" ? `Metro did not answer /status on port ${port} within ${timeoutMs / 1000} s; it was stopped` : result.reason;
  return { ok: false, message: `${why}. Last log lines:\n${logTail(dir) || "(empty)"}` };
};

export const down = async ({ dir = STATE_DIR } = {}) => {
  const state = ownMetro(readState(dir));
  rmSync(files(dir).state, { force: true });
  if (!state) return { ok: true, message: "No Metro started by `make mobile-metro-up` is running for this worktree." };
  await stopGroup(state);
  return { ok: true, message: `Stopped Metro on port ${state.port}.` };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (command !== "up" && command !== "down") {
    console.error("usage: mobile-metro.mjs up [expo start flags] | down");
    process.exit(2);
  }
  const result = await (command === "up" ? up({ args: rest }) : down());
  (result.ok ? console.log : console.error)(result.message);
  process.exit(result.ok ? 0 : 1);
}
