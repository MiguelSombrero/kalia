#!/usr/bin/env node
// Gives this worktree its own host ports for the compose stack, so two
// worktrees can run it at once (`make stack-env`).
// Slot n adds 100*n to every default port. The main checkout is slot 0 and
// keeps the defaults, so nothing is written for it. A worktree takes the
// lowest slot that no other worktree's .env holds and whose ports are free
// to bind, and keeps what it was given on a re-run. Nothing per-worktree is
// committed: the other worktrees are found through `git worktree list` and
// their own gitignored .env files.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PORT_DEFAULTS, parseEnvFile, readEnvFile } from "./stack-ports.mjs";

const SLOT_STEP = 100;
const MAX_SLOT = 99;

// The slots an environment's port variables put it in. The defaults are
// slot 0; a value that is no whole number of steps above its default (a port
// pinned by hand) holds no slot.
export const slotsHeldBy = (env) =>
  Object.entries(PORT_DEFAULTS).flatMap(([name, base]) => {
    const offset = (Number(env[name]) - base) / SLOT_STEP;
    return env[name] && Number.isInteger(offset) && offset >= 0 ? [offset] : [];
  });

// What the web app's rename (ADR-0092) took from a root .env, old key to new.
// Left alone, FRONTEND_PORT would be ignored, so the stack came up on the
// default port beside whatever else holds it.
export const RENAMED_KEYS = {
  FRONTEND_PORT: "WEB_PORT",
  FRONTEND_URL: "WEB_URL",
  KALIA_FRONTEND_CLIENT_SECRET: "KALIA_WEB_CLIENT_SECRET",
};

// Renames each old key to its new name in place, keeping its value. A key
// whose new name is already set is left as it is and reported in `kept`, since
// choosing between two values is not this script's call.
export const migrateEnvText = (text) => {
  const present = parseEnvFile(text);
  const renamed = [];
  const kept = [];
  const migrated = text
    .split("\n")
    .map((line) => {
      const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=.*)$/);
      const next = match && RENAMED_KEYS[match[2]];
      if (!next) return line;
      if (next in present) {
        kept.push(match[2]);
        return line;
      }
      renamed.push(match[2]);
      return `${match[1]}${next}${match[3]}`;
    })
    .join("\n");
  return { text: migrated, renamed, kept };
};

export const portsForSlot = (slot) =>
  Object.fromEntries(Object.entries(PORT_DEFAULTS).map(([name, base]) => [name, base + SLOT_STEP * slot]));

// Returns the port variables to write into this worktree's .env — none for the
// main checkout, none when all six are already set.
export const planPorts = async ({ isMainCheckout, ownEnv, otherEnvs, isFree }) => {
  if (isMainCheckout) return { slot: 0, write: {} };
  const missing = Object.keys(PORT_DEFAULTS).filter((name) => !ownEnv[name]);
  if (missing.length === 0) return { slot: undefined, write: {} };

  const taken = new Set([0, ...otherEnvs.flatMap(slotsHeldBy)]);
  for (let slot = 1; slot <= MAX_SLOT; slot++) {
    if (taken.has(slot)) continue;
    const ports = portsForSlot(slot);
    const free = await Promise.all(missing.map((name) => isFree(ports[name])));
    if (free.every(Boolean)) {
      return { slot, write: Object.fromEntries(missing.map((name) => [name, ports[name]])) };
    }
  }
  throw new Error(`no free slot up to ${MAX_SLOT}: every candidate has a port in use`);
};

// A listener on any address counts: Docker publishes on 127.0.0.1, but a
// process bound to a wildcard address still blocks it, and binding a specific
// address over a wildcard one can succeed on macOS.
export const isPortFree = async (port) => {
  const accepting = await new Promise((done) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => (socket.destroy(), done(true)));
    socket.once("error", () => done(false));
  });
  if (accepting) return false;
  return new Promise((done) => {
    const server = net.createServer();
    server.once("error", () => done(false));
    server.listen({ port, host: "127.0.0.1" }, () => server.close(() => done(true)));
  });
};

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const migrateEnvFile = (envFile) => {
  let text;
  try {
    text = readFileSync(envFile, "utf8");
  } catch {
    return;
  }
  const { text: migrated, renamed, kept } = migrateEnvText(text);
  if (renamed.length > 0) {
    writeFileSync(envFile, migrated);
    for (const old of renamed) console.log(`renamed ${old} to ${RENAMED_KEYS[old]} in ${envFile}`);
  }
  for (const old of kept) {
    console.error(`${envFile} sets both ${old} and ${RENAMED_KEYS[old]}: delete ${old}, which nothing reads any more`);
  }
};

const run = async () => {
  const top = git("rev-parse", "--show-toplevel");
  const isMainCheckout = resolve(git("rev-parse", "--absolute-git-dir")) === resolve(git("rev-parse", "--path-format=absolute", "--git-common-dir"));
  const otherPaths = git("worktree", "list", "--porcelain")
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length))
    .filter((path) => resolve(path) !== resolve(top));

  const envFile = resolve(top, ".env");
  migrateEnvFile(envFile);
  const { slot, write } = await planPorts({
    isMainCheckout,
    ownEnv: readEnvFile(envFile),
    otherEnvs: otherPaths.map((path) => readEnvFile(resolve(path, ".env"))),
    isFree: isPortFree,
  });

  if (isMainCheckout) {
    console.log("main checkout: the stack keeps the default ports, nothing written");
    return;
  }
  const entries = Object.entries(write);
  if (entries.length === 0) {
    console.log(`${envFile} already sets every port, nothing written`);
    return;
  }
  let existing = "";
  try {
    existing = readFileSync(envFile, "utf8");
  } catch {
    // no .env yet: this creates it
  }
  const separator = existing === "" || existing.endsWith("\n") ? "" : "\n";
  const block = `# Host ports of this worktree's stack, written by \`make stack-env\` (slot ${slot})\n${entries
    .map(([name, port]) => `${name}=${port}`)
    .join("\n")}\n`;
  appendFileSync(envFile, separator + block);
  console.log(`wrote slot ${slot} to ${envFile}:`);
  for (const [name, port] of entries) console.log(`  ${name}=${port}`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
