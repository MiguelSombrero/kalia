#!/usr/bin/env node
// Allocates the next ADR number. Sibling of the check-*.mjs checkers, same
// no-dependency constraint. Prints the number on stdout and nothing else, so
// it can be substituted into a command; anything explanatory goes to stderr.
//
// Scanning docs/adr/ in the working tree is not enough, and this script
// exists because that was learned twice. ADR-0034 was written twice under one
// number by two sessions reading the same directory. Then this script's own
// first version, which read only the directory, returned 0045 for an ADR that
// landed on dev from a concurrently open pull request while this one was
// being written — a number is taken the moment another *branch* claims it,
// not when it reaches dev. So every remote-tracking ref is scanned too.
//
// Refs are read as fetched: a stale remote-tracking ref can still miss a
// branch pushed since the last fetch, which is why `make next-adr` fetches
// first. That residual gap is real and cannot be closed locally.

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
const numbersIn = (names) =>
  names.map((n) => /(?:^|\/)(\d{4})-[^/]*\.md$/.exec(n)?.[1]).filter(Boolean).map(Number);

const used = new Set(numbersIn(readdirSync(resolve(ROOT, "docs/adr"))));

let refsScanned = 0;
try {
  const refs = git("for-each-ref", "--format=%(refname)", "refs/remotes").split("\n").filter(Boolean);
  for (const ref of refs) {
    // A ref that cannot be read (a symbolic origin/HEAD, a pruned branch) is
    // skipped rather than fatal: a partial scan still beats the directory
    // alone, and failing here would make the command unusable offline.
    try {
      numbersIn(git("ls-tree", "--name-only", ref, "docs/adr/").split("\n").filter(Boolean))
        .forEach((n) => used.add(n));
      refsScanned++;
    } catch {}
  }
} catch {
  console.error("warning: could not read remote-tracking refs — scanned docs/adr/ only");
}

// max + 1 rather than the lowest free number: a gap means a withdrawn ADR,
// and reusing its number would silently repoint every link that still names
// it. ADR-0019 makes ids permanent for the same reason task ids are.
const next = (used.size === 0 ? 0 : Math.max(...used)) + 1;

console.error(`scanned docs/adr/ plus ${refsScanned} remote-tracking ref(s); highest in use ${String(next - 1).padStart(4, "0")}`);
console.log(String(next).padStart(4, "0"));
