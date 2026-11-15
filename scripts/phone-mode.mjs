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

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PHONE_HOST_VARIABLE, ROOT, phoneHostOf, portOf, readEnvFile, stackEnv } from "./stack-ports.mjs";
import { tailscaleFacts } from "./tailscale.mjs";

// The edge's three published ports, and Metro's, which only a Metro started by `make mobile-start` or `mobile-metro-up` listens on.
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

// The loopback ports `tailscale serve status --json` says are forwarded: the targets of its web handlers, and its TCP listeners when it names no handler.
export const forwardedPortsOf = (statusJson) => {
  let status;
  try {
    status = JSON.parse(statusJson);
  } catch {
    return [];
  }
  const ports = new Set();
  for (const site of Object.values(status?.Web ?? {})) {
    for (const handler of Object.values(site?.Handlers ?? {})) {
      const port = String(handler?.Proxy ?? "").match(/:(\d+)\/?$/)?.[1];
      if (port) ports.add(port);
    }
  }
  for (const port of Object.keys(status?.TCP ?? {})) ports.add(port);
  return [...ports].sort((a, b) => Number(a) - Number(b));
};

// The checkouts in phone mode whose ports are among the forwarded ones, named by their directory so no path is printed. `checkouts` is [{ name, env }].
export const forwardOwners = (forwarded, checkouts) =>
  checkouts
    .filter(({ env }) => phoneHostOf(env) && FORWARDED_PORTS.some((name) => forwarded.includes(String(portOf(env, name)))))
    .map(({ name }) => name);

// The other checkouts whose forwards are the machine's now.
export const otherOwners = (forwarded, checkouts, self) => forwardOwners(forwarded, checkouts).filter((name) => name !== self);

// What a switch says about the forwards it replaces, or undefined when there are none or they are this checkout's own.
export const takeoverNotice = (forwarded, checkouts, self) => {
  if (forwarded.length === 0) return undefined;
  const others = otherOwners(forwarded, checkouts, self);
  if (others.length) return `replacing the tailnet forwards of ${others.join(", ")}: its stack stays in phone mode, but the phone no longer reaches it`;
  return forwardOwners(forwarded, checkouts).includes(self) ? undefined : "replacing tailnet forwards that no checkout in phone mode owns";
};

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

const checkouts = () => {
  const listing = execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  return listing
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice(9))
    .map((path) => ({ name: basename(path), env: { ...readEnvFile(resolve(path, ".env")) } }));
};

const currentForwards = (facts) => {
  const result = spawnSync(facts.command, ["serve", "status", "--json"], { encoding: "utf8" });
  return result.status === 0 ? forwardedPortsOf(result.stdout) : [];
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
    const notice = takeoverNotice(currentForwards(facts), checkouts(), basename(ROOT));
    if (notice) console.log(notice);
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
  const others = facts.installed ? otherOwners(currentForwards(facts), checkouts(), basename(ROOT)) : [];
  if (others.length) {
    console.log(`phone mode is off: the stack is localhost only; the tailnet forwards are ${others.join(", ")}'s and stay`);
    return;
  }
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
