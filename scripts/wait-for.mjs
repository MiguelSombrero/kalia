#!/usr/bin/env node
// Waits for a background command to be ready, with a ceiling and a failure
// exit, so a session never blocks on something that will not happen:
//   node scripts/wait-for.mjs --timeout <seconds> [--fail <text>[|<text>...]] [--interval <seconds>] [--lines <n>] -- <probe command...>
// The probe runs every interval. Exit 0 once it exits 0; exit 1 as soon as its
// output matches --fail; exit 124 when --timeout passes first. The last lines
// of the probe's output are printed on every exit, so the caller reports what
// it was waiting on and what the last output said. --timeout is required and
// capped at MAX_TIMEOUT_SECONDS: a wait with no ceiling is the failure this
// exists to remove (mobile/README.md, "Waiting on a background command").

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MAX_TIMEOUT_SECONDS = 1800;
export const EXIT = { ready: 0, failed: 1, usage: 2, timeout: 124 };

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// `--fail` is literal text, `|` separating alternatives: it is never compiled
// as a regular expression, so nothing typed on the command line can reach the
// regex engine.
export const failMatcher = (text) => {
  const needles = text.split("|").filter((needle) => needle !== "");
  return { test: (output) => needles.some((needle) => output.includes(needle)), toString: () => needles.map((needle) => `"${needle}"`).join(" or ") };
};

export const lastLines = (text, count) => text.split("\n").filter((line) => line.trim() !== "").slice(-count).join("\n");

/**
 * @param {object} options
 * @param {() => Promise<{ ok: boolean, output: string }> | { ok: boolean, output: string }} options.probe one look at the thing waited on
 * @param {number} options.timeoutMs the ceiling; required
 * @param {number} [options.intervalMs]
 * @param {{ test: (output: string) => boolean, toString: () => string }} [options.failPattern] output that means it will never be ready
 * @param {() => string | undefined} [options.died] a reason the thing waited on has already ended
 * @returns {Promise<{ outcome: "ready" | "failed" | "timeout", output: string, reason?: string }>}
 */
export const waitFor = async ({ probe, timeoutMs, intervalMs = 2000, failPattern, died }) => {
  const start = Date.now();
  let output = "";
  for (;;) {
    const seen = await probe();
    ({ output } = seen);
    if (failPattern?.test(output)) return { outcome: "failed", output, reason: `output matched ${failPattern}` };
    if (seen.ok) return { outcome: "ready", output };
    const reason = died?.();
    if (reason) return { outcome: "failed", output, reason };
    const remaining = timeoutMs - (Date.now() - start);
    if (remaining <= 0) return { outcome: "timeout", output };
    await sleep(Math.min(intervalMs, remaining));
  }
};
const parse = (argv) => {
  const split = argv.indexOf("--");
  if (split < 0 || split === argv.length - 1) return { problem: "name the probe command after `--`" };
  const options = { lines: 20, interval: 2 };
  const flags = argv.slice(0, split);
  for (let k = 0; k < flags.length; k += 2) {
    const name = flags[k];
    const value = flags[k + 1];
    if (!["--timeout", "--fail", "--interval", "--lines"].includes(name) || value === undefined) return { problem: `unknown or incomplete option ${name}` };
    options[name.slice(2)] = value;
  }
  const timeout = Number(options.timeout);
  if (!(timeout > 0)) return { problem: "--timeout <seconds> is required: a wait has a ceiling" };
  if (timeout > MAX_TIMEOUT_SECONDS) return { problem: `--timeout is capped at ${MAX_TIMEOUT_SECONDS} seconds; a longer wait is polled by the session, not blocked on` };
  const interval = Number(options.interval);
  const lines = Number(options.lines);
  if (!(interval > 0) || !(lines > 0)) return { problem: "--interval and --lines are positive numbers" };
  const failPattern = options.fail === undefined ? undefined : failMatcher(options.fail);
  return { timeoutMs: timeout * 1000, intervalMs: interval * 1000, lines, failPattern, command: argv.slice(split + 1) };
};

// One probe run is itself bounded, so a probe that hangs cannot outlive the ceiling.
const runProbe = (command, limitMs) => () => {
  const { status, stdout, stderr, error } = spawnSync(command[0], command.slice(1), { encoding: "utf8", timeout: limitMs });
  return { ok: status === 0, output: `${stdout ?? ""}${stderr ?? ""}${error ? `${error.message}\n` : ""}` };
};

export const main = async (argv) => {
  const parsed = parse(argv);
  if (parsed.problem) {
    console.error(`wait-for: ${parsed.problem}`);
    return EXIT.usage;
  }
  const { timeoutMs, intervalMs, lines, failPattern, command } = parsed;
  const result = await waitFor({ probe: runProbe(command, Math.min(timeoutMs, 30_000)), timeoutMs, intervalMs, failPattern });
  const tail = lastLines(result.output, lines);
  if (result.outcome === "ready") {
    console.log(`wait-for: ready${tail ? `\n${tail}` : ""}`);
    return EXIT.ready;
  }
  const verdict = result.outcome === "failed" ? `failed (${result.reason})` : `timed out after ${timeoutMs / 1000} s`;
  console.error(`wait-for: ${verdict}; last output of \`${command.join(" ")}\`:\n${tail || "(none)"}`);
  return result.outcome === "failed" ? EXIT.failed : EXIT.timeout;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main(process.argv.slice(2)));
}
