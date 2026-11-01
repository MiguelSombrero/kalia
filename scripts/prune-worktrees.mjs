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
// usage: prune-worktrees.mjs [--no-fetch] [--dry-run]

import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "origin/dev";

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

export function prune({ cwd, fetch = true, dryRun = false, directories = processDirectories() } = {}) {
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
