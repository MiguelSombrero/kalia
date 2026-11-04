#!/usr/bin/env node
// Switches this checkout's stack into and out of phone mode (ADR-0097):
//   node scripts/phone-mode.mjs on <tailnet-host>   (`make phone-mode HOST=...`)
//   node scripts/phone-mode.mjs off                 (`make phone-mode-off`)
//   node scripts/phone-mode.mjs refuse <command>    exits 1 naming the command when phone mode is on
//   node scripts/phone-mode.mjs metro-args          prints the flags `make mobile-start` adds
// Phone mode is on exactly when KALIA_PHONE_HOST is non-empty in the root .env.
// Switching rewrites that line, recreates the services that carry it, and
// replaces the machine's `tailscale serve` forwards with this stack's ports.
// The host name is printed nowhere: it belongs to the machine.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PHONE_HOST_VARIABLE, ROOT, phoneHostOf, portOf, stackEnv } from "./stack-ports.mjs";
import { tailscaleFacts } from "./tailscale.mjs";

// The edge's three published ports, and Metro's, which only `make mobile-start` ever listens on.
export const FORWARDED_PORTS = ["WEB_PORT", "BACKEND_PORT", "KEYCLOAK_PORT", "METRO_PORT"];

export const validHost = (host) => host.length <= 253 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(host);

// One reset, so a previous worktree's forwards are gone before this one's exist.
export const serveCalls = (env) => [
  ["serve", "reset"],
  ...FORWARDED_PORTS.map((name) => {
    const port = portOf(env, name);
    return ["serve", "--bg", `--http=${port}`, `http://127.0.0.1:${port}`];
  }),
];

const BLOCK_HEADING = "# Phone mode (ADR-0097), written by `make phone-mode`";
const LINE = new RegExp(`^\\s*${PHONE_HOST_VARIABLE}\\s*=.*$`, "m");

export const setPhoneHost = (text, host) => {
  const line = `${PHONE_HOST_VARIABLE}=${host}`;
  if (LINE.test(text)) return text.replace(LINE, () => line);
  const separator = text === "" || text.endsWith("\n") ? "" : "\n";
  return `${text}${separator}${BLOCK_HEADING}\n${line}\n`;
};

export const clearPhoneHost = (text) =>
  text
    .split("\n")
    .filter((line, index, lines) => !LINE.test(line) && !(line === BLOCK_HEADING && LINE.test(lines[index + 1] ?? "")))
    .join("\n");

export const phoneModeRefusal = (env, command) =>
  phoneHostOf(env)
    ? `${command} does not work in phone mode: it reaches the stack as localhost, which is no longer the issuer (ADR-0097). Run \`make phone-mode-off\` first.`
    : undefined;

export const metroArgs = (env) => (phoneHostOf(env) ? ["--localhost"] : []);

export const hostProblem = (host, facts) => {
  if (!host || !validHost(host)) return "HOST must be this Mac's name on the tailnet, as `tailscale status` lists it";
  if (!facts.installed) return "Tailscale is not installed; see mobile/README.md, \"Reach the stack from the iPhone\"";
  if (!facts.running) return "Tailscale is not running or not signed in; open it and sign in first";
  if (!facts.names.includes(host.toLowerCase())) return "HOST is not the name Tailscale gives this Mac; it is the first column of `tailscale status` for this Mac, not the display name";
  return undefined;
};

const envFile = resolve(ROOT, ".env");
const readEnv = () => {
  try {
    return readFileSync(envFile, "utf8");
  } catch {
    return "";
  }
};

const compose = (...args) => execFileSync("docker", ["compose", ...args], { cwd: ROOT, stdio: "inherit" });

// Only a stack that is up is recreated; a stopped one picks the value up at its next `make up`.
const recreate = () => {
  const running = execFileSync("docker", ["compose", "ps", "--status", "running", "--quiet"], { cwd: ROOT, encoding: "utf8" });
  if (running.trim() === "") {
    console.log("the stack is not running; `make up` starts it in the new mode");
    return;
  }
  compose("up", "-d");
  // --wait over the whole stack fails on a one-shot that finished (keycloak-config, keycloak-seed).
  compose("up", "-d", "--wait", "--wait-timeout", "300", "edge", "backend", "keycloak");
};

const tailscale = (facts, calls) => {
  for (const call of calls) execFileSync(facts.command, call, { stdio: "inherit" });
};

const on = (host) => {
  if (process.env[PHONE_HOST_VARIABLE]) {
    throw new Error(`${PHONE_HOST_VARIABLE} is exported in this shell, and wins over the root .env; unset it first`);
  }
  const facts = tailscaleFacts();
  const problem = hostProblem(host, facts);
  if (problem) throw new Error(problem);
  const before = readEnv();
  writeFileSync(envFile, setPhoneHost(before, host));
  try {
    recreate();
    tailscale(facts, serveCalls(stackEnv()));
  } catch (error) {
    writeFileSync(envFile, before);
    throw new Error(`${error.message}; the root .env is as it was, but the services may have been recreated: run \`make phone-mode-off\` to settle them`);
  }
  console.log("phone mode is on: the web app, API, Keycloak and Metro ports are forwarded on the tailnet; the installed app signs in again after a switch");
};

const off = () => {
  if (process.env[PHONE_HOST_VARIABLE]) {
    throw new Error(`${PHONE_HOST_VARIABLE} is exported in this shell, and wins over the root .env; unset it first`);
  }
  writeFileSync(envFile, clearPhoneHost(readEnv()));
  recreate();
  const facts = tailscaleFacts();
  if (facts.installed) tailscale(facts, [["serve", "reset"]]);
  console.log("phone mode is off: the stack is localhost only and the tailnet forwards are removed");
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, argument] = process.argv.slice(2);
  try {
    if (command === "on") on(argument);
    else if (command === "off") off();
    else if (command === "refuse") {
      const message = phoneModeRefusal(stackEnv(), argument);
      if (message) {
        console.error(message);
        process.exit(1);
      }
    } else if (command === "metro-args") console.log(metroArgs(stackEnv()).join(" "));
    else {
      console.error("usage: phone-mode.mjs on <tailnet-host> | off | refuse <command> | metro-args");
      process.exit(2);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
