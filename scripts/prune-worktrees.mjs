#!/usr/bin/env node
// Removes the task worktrees under .claude/worktrees/ whose PR has
// merged, so disk is reclaimed however a session created its worktree. Run by
// the SessionStart hook in .claude/settings.json; the `worktree` skill points
// here. Conservative by construction: anything that fails one test is kept.
//
// A worktree is removed only when all of these hold:
//   - its HEAD is the second parent of a first-parent merge commit on
//     origin/dev, i.e. a PR merged exactly this work. A branch
//     merely contained in dev is not enough: a fresh session's branch sits at
//     dev's tip and would qualify;
//   - its tree is clean, untracked files included, so git removes it without
//     --force;
//   - it is not this session's own worktree, not locked, and no process has
//     its working directory inside it.
//
// Two more jobs share the SessionStart hook and the removal: it warns, in the
// session only, when free disk space is low, naming the caches by kind (never
// by path); and removing a worktree removes that worktree's own Xcode
// DerivedData, found by the workspace path Xcode records in it.
//
// usage: prune-worktrees.mjs [--no-fetch] [--dry-run]
//        prune-worktrees.mjs --derived-data <removed-worktree-path>

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync, rmSync, statfsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "origin/dev";
const GB = 1024 ** 3;
export const LOW_DISK_BYTES = 20 * GB;
export const DERIVED_DATA = join(homedir(), "Library", "Developer", "Xcode", "DerivedData");

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function tryGit(cwd, ...args) {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
}

export function listWorktrees(cwd) {
  const out = git(cwd, "worktree", "list", "--porcelain");
  return out
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const entry = { path: "", head: null, branch: null, locked: false };
      for (const line of block.split("\n")) {
        if (line.startsWith("worktree ")) entry.path = line.slice(9);
        else if (line.startsWith("HEAD ")) entry.head = line.slice(5);
        else if (line.startsWith("branch ")) entry.branch = line.slice(7).replace(/^refs\/heads\//, "");
        else if (line === "locked" || line.startsWith("locked ")) entry.locked = true;
      }
      return entry;
    });
}

// The tips of pull requests merged into dev. First-parent only: a branch that
// merged dev into itself brings that merge's parents in too, and those are
// ordinary dev commits a fresh worktree may be sitting on.
export function mergedPullRequestTips(cwd, base = BASE) {
  const out = tryGit(cwd, "rev-list", "--first-parent", "--merges", "--parents", base);
  const tips = new Set();
  for (const line of (out ?? "").split("\n").filter(Boolean)) {
    const [, , ...others] = line.split(" ");
    for (const tip of others) tips.add(tip);
  }
  return tips;
}

// The working directories of every process we may see. null when they cannot
// be listed, which callers treat as "everything is in use".
export function processDirectories() {
  const result = spawnSync("lsof", ["-d", "cwd", "-Fn"], { encoding: "utf8" });
  if (result.error || result.status === null || !result.stdout) return null;
  return result.stdout
    .split("\n")
    .filter((line) => line.startsWith("n"))
    .map((line) => realPath(line.slice(1)));
}

function realPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

export function insideAny(path, directories) {
  const root = realPath(path);
  return directories.some((dir) => dir === root || dir.startsWith(root + sep));
}

// A removed worktree's path no longer resolves, so its parent stands in for it.
function canonicalPath(path) {
  const absolute = resolve(path);
  try {
    return realpathSync(absolute);
  } catch {
    return join(realPath(dirname(absolute)), basename(absolute));
  }
}

const workspacePathOf = (directory) => {
  try {
    return readFileSync(join(directory, "info.plist"), "utf8").match(/<key>WorkspacePath<\/key>\s*<string>([^<]*)<\/string>/)?.[1];
  } catch {
    return undefined;
  }
};

// Only a directory whose recorded workspace is inside this worktree goes; Xcode's shared caches and every other worktree's build stay.
export function removeDerivedData(worktreePath, { derivedData = DERIVED_DATA, remove = rmSync } = {}) {
  const worktrees = [canonicalPath(worktreePath), resolve(worktreePath)];
  let entries;
  try {
    entries = readdirSync(derivedData, { withFileTypes: true });
  } catch {
    return [];
  }
  const removed = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(derivedData, entry.name);
    const workspace = workspacePathOf(directory);
    if (workspace === undefined || !worktrees.some((worktree) => workspace === worktree || workspace.startsWith(worktree + sep))) continue;
    try {
      remove(directory, { recursive: true, force: true });
      removed.push(directory);
    } catch {
      continue;
    }
  }
  return removed;
}

export const freeBytesAt = (path) => {
  try {
    const stats = statfsSync(path);
    return stats.bavail * stats.bsize;
  } catch {
    return undefined;
  }
};

const du = (path) => {
  const result = spawnSync("du", ["-sk", path], { encoding: "utf8", timeout: 4000 });
  const kilobytes = Number(result.stdout?.split("\t")[0]);
  return Number.isFinite(kilobytes) ? kilobytes * 1024 : 0;
};

const UNITS = { B: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
const dockerBytes = () => {
  const result = spawnSync("docker", ["system", "df", "--format", "{{.Type}}\t{{.Size}}"], { encoding: "utf8", timeout: 4000 });
  let total = 0;
  for (const line of (result.status === 0 ? result.stdout : "").split("\n")) {
    const [type, size] = line.split("\t");
    if (type !== "Images" && type !== "Build Cache" && type !== "Local Volumes") continue;
    const match = size?.match(/^([\d.]+)\s*([kMGT]?B)$/);
    if (match) total += Number(match[1]) * UNITS[match[2]];
  }
  return total;
};

// The caches that have filled this machine's disk before (docs/common-failures.md), by kind.
export const measureCaches = (home = homedir()) => [
  { name: "Xcode DerivedData", bytes: du(join(home, "Library", "Developer", "Xcode", "DerivedData")) },
  { name: "Docker images, volumes and build cache", bytes: dockerBytes() },
  { name: "Gradle caches", bytes: du(join(home, ".gradle")) },
  { name: "Android emulators and SDK", bytes: du(join(home, ".android")) + du(join(home, "Library", "Android")) },
];

const gb = (bytes) => `${Math.round(bytes / GB)} GB`;

// Undefined while there is room; the measurement runs only when there is not.
export function lowDiskWarning(freeBytes, measure = measureCaches, threshold = LOW_DISK_BYTES) {
  if (freeBytes === undefined || freeBytes >= threshold) return undefined;
  const largest = measure()
    .filter((cache) => cache.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 3)
    .map((cache) => `${cache.name} ${gb(cache.bytes)}`);
  const caches = largest.length ? ` Largest caches: ${largest.join(", ")}.` : "";
  return `Low disk: ${gb(freeBytes)} free, below ${gb(threshold)}. Builds fail with errors that do not name the disk (docs/common-failures.md).${caches} Free space before starting a build or the stack.`;
}

export function reportLowDisk(freeBytes, { measure = measureCaches, log = console.log } = {}) {
  const warning = lowDiskWarning(freeBytes, measure);
  if (warning) log(warning);
}

export function prune({ cwd, fetch = true, dryRun = false, directories = processDirectories(), derivedData = DERIVED_DATA } = {}) {
  const removed = [];
  const kept = [];
  const top = realPath(git(cwd, "rev-parse", "--show-toplevel").trim());
  const common = realPath(resolve(cwd, git(cwd, "rev-parse", "--git-common-dir").trim()));
  const mainCheckout = dirname(common);
  const root = resolve(mainCheckout, ".claude", "worktrees") + sep;

  if (fetch) {
    spawnSync("git", ["fetch", "--quiet", "origin", "dev"], { cwd, timeout: 10000, stdio: "ignore" });
  }
  if (tryGit(cwd, "rev-parse", "--verify", "--quiet", BASE) === null) {
    return { removed, kept: [{ path: mainCheckout, reason: `${BASE} is not known here` }] };
  }

  const tips = mergedPullRequestTips(cwd);
  for (const worktree of listWorktrees(cwd)) {
    const path = realPath(worktree.path);
    if (!path.startsWith(root)) continue;
    const keep = (reason) => kept.push({ path: worktree.path, reason });

    if (path === top) keep("this session's own worktree");
    else if (worktree.locked) keep("locked");
    else if (!worktree.head || !tips.has(worktree.head)) keep("its work is not a merged pull request's");
    else if (tryGit(path, "status", "--porcelain") !== "") keep("it has uncommitted changes");
    else if (directories === null) keep("running processes cannot be listed");
    else if (insideAny(path, directories)) keep("a process is working in it");
    else if (dryRun) removed.push({ path: worktree.path, branch: worktree.branch });
    else {
      try {
        git(cwd, "worktree", "remove", worktree.path);
      } catch (error) {
        keep(`git refused: ${String(error.stderr ?? error.message).trim()}`);
        continue;
      }
      removeDerivedData(path, { derivedData });
      // -D is safe: the tip is a merged PR's, reachable from origin/dev.
      // -d would refuse whenever this session's own HEAD lacks that branch.
      if (worktree.branch) tryGit(cwd, "branch", "-D", worktree.branch);
      removed.push({ path: worktree.path, branch: worktree.branch });
    }
  }

  if (!dryRun) git(cwd, "worktree", "prune");
  return { removed, kept };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    reportLowDisk(freeBytesAt(process.cwd()));
  } catch (error) {
    console.error(`prune-worktrees: ${error.message}`);
  }
  try {
    if (args[0] === "--derived-data") {
      if (!args[1]) throw new Error("--derived-data takes the removed worktree's path");
      if (existsSync(args[1])) throw new Error("that worktree still exists; remove it first (git worktree remove)");
      for (const directory of removeDerivedData(args[1])) console.log(`removed DerivedData ${basename(directory)}`);
      process.exit(0);
    }
    const { removed } = prune({
      cwd: process.cwd(),
      fetch: !args.includes("--no-fetch"),
      dryRun: args.includes("--dry-run"),
    });
    const verb = args.includes("--dry-run") ? "would remove" : "removed";
    for (const { path, branch } of removed) console.log(`${verb} merged worktree ${path}${branch ? ` (${branch})` : ""}`);
  } catch (error) {
    console.error(`prune-worktrees: ${error.message}`);
  }
  // A SessionStart hook must never block the session it runs for.
  process.exit(0);
}
