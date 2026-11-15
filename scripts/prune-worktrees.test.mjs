#!/usr/bin/env node
// Self-test for prune-worktrees.mjs, run against throwaway repositories only:
// a script that deletes worktrees is never exercised on the real ones. Runs in
// `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lowDiskWarning, prune, removeDerivedData, reportLowDisk } from "./prune-worktrees.mjs";

// A git hook (the pre-push gate runs `make check`) exports GIT_DIR and friends,
// which would point every command below, and the script's own, at the real
// repository instead of the fixture.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("GIT_")) delete process.env[name];
}

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.com",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.com",
};

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function commit(cwd, file, message) {
  writeFileSync(join(cwd, file), message);
  git(cwd, "add", file);
  git(cwd, "commit", "-q", "-m", message);
}

// A main checkout on dev with origin/dev, plus helpers to make worktrees the
// way the app does (under .claude/worktrees/) and to merge their branches the
// way GitHub does (a merge commit on dev's first-parent chain).
function fixture() {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "prune-worktrees-")));
  assert.ok(base.startsWith(realpathSync(tmpdir())), "fixtures live in the temp directory only");
  const origin = join(base, "origin.git");
  const main = join(base, "main");
  git(base, "init", "-q", "--bare", "-b", "dev", origin);
  git(base, "clone", "-q", origin, main);
  git(main, "checkout", "-q", "-B", "dev");
  commit(main, "README", "first");
  git(main, "push", "-q", "origin", "dev");
  mkdirSync(join(main, ".claude", "worktrees"), { recursive: true });

  const f = {
    base,
    main,
    // Branch off origin/dev into a worktree, optionally with a commit of its own.
    worktree(name, { work = true } = {}) {
      const path = join(main, ".claude", "worktrees", name);
      git(main, "worktree", "add", "-q", path, "-b", name, "origin/dev");
      if (work) commit(path, `${name}.txt`, `work on ${name}`);
      return path;
    },
    // What GitHub's merge button does, then the push the next session fetches.
    merge(name) {
      git(main, "merge", "-q", "--no-ff", "-m", `Merge ${name}`, name);
      git(main, "push", "-q", "origin", "dev");
    },
    // The session that starts afterwards: its own worktree, off the new dev.
    session() {
      return f.worktree("session", { work: false });
    },
    derivedData: join(base, "DerivedData"),
    // What Xcode leaves for a build of a workspace: a hashed directory whose info.plist records that workspace.
    build(workspace, name) {
      const directory = join(base, "DerivedData", name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "info.plist"), `<?xml version="1.0"?>\n<plist version="1.0">\n<dict>\n\t<key>LastAccessedDate</key>\n\t<date>2026-11-12T04:52:37Z</date>\n\t<key>WorkspacePath</key>\n\t<string>${workspace}</string>\n</dict>\n</plist>\n`);
      return directory;
    },
    run(session, options = {}) {
      return prune({ cwd: session, fetch: false, directories: [], derivedData: join(base, "DerivedData"), ...options });
    },
    exists: (path) => existsSync(path),
    branches: () => git(main, "branch", "--format=%(refname:short)").split("\n"),
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  };
  return f;
}

function withFixture(fn) {
  const f = fixture();
  try {
    fn(f);
  } finally {
    f.cleanup();
  }
}

const keptPaths = (result) => result.kept.map((entry) => entry.path);

test("removes a merged clean worktree and its branch, from a session started afterwards", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    f.merge("done");
    git(f.main, "fetch", "-q", "origin");
    const session = f.session();
    const result = f.run(session);
    assert.deepEqual(result.removed.map((r) => r.path), [done]);
    assert.equal(f.exists(done), false);
    assert.ok(!git(f.main, "worktree", "list").includes(done));
    assert.ok(!f.branches().includes("done"));
    assert.equal(f.exists(session), true);
  });
});

test("keeps a merged worktree with uncommitted changes", () => {
  withFixture((f) => {
    const dirty = f.worktree("dirty");
    f.merge("dirty");
    writeFileSync(join(dirty, "README"), "edited after the merge");
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.ok(keptPaths(result).includes(dirty));
    assert.equal(f.exists(dirty), true);
    assert.ok(f.branches().includes("dirty"));
  });
});

test("keeps a merged worktree holding only an untracked file", () => {
  withFixture((f) => {
    const untracked = f.worktree("untracked");
    f.merge("untracked");
    writeFileSync(join(untracked, "notes.txt"), "not committed anywhere");
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(untracked), true);
  });
});

test("keeps a worktree whose branch has not been merged", () => {
  withFixture((f) => {
    const open = f.worktree("open");
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.ok(keptPaths(result).includes(open));
    assert.ok(f.branches().includes("open"));
  });
});

test("keeps a worktree with commits made after its pull request merged", () => {
  withFixture((f) => {
    const later = f.worktree("later");
    f.merge("later");
    commit(later, "more.txt", "work after the merge");
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(later), true);
  });
});

test("keeps a fresh worktree sitting on a commit dev already contains", () => {
  withFixture((f) => {
    const fresh = f.worktree("fresh", { work: false });
    const other = f.worktree("other");
    f.merge("other");
    const result = f.run(f.session());
    assert.deepEqual(result.removed.map((r) => r.path), [other], "ancestry alone must not count as merged");
    assert.equal(f.exists(fresh), true);
  });
});

test("keeps a fresh worktree on a commit that a dev-sync merge brought into a merged branch", () => {
  withFixture((f) => {
    const synced = f.worktree("synced");
    f.worktree("other");
    f.merge("other");
    git(synced, "merge", "-q", "--no-ff", "-m", "Merge dev into synced", "origin/dev");
    git(f.main, "fetch", "-q", "origin");
    const stale = join(f.main, ".claude", "worktrees", "stale");
    git(f.main, "worktree", "add", "-q", stale, "-b", "stale", git(f.main, "rev-parse", "dev^"));
    f.merge("synced");
    const result = f.run(f.session());
    assert.ok(!result.removed.some((r) => r.path === stale));
    assert.equal(f.exists(stale), true);
  });
});

test("keeps a worktree a process is working in", () => {
  withFixture((f) => {
    const busy = f.worktree("busy");
    f.merge("busy");
    const result = f.run(f.session(), { directories: [join(busy, "src")] });
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(busy), true);
  });
});

test("keeps everything when running processes cannot be listed", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    f.merge("done");
    const result = f.run(f.session(), { directories: null });
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(done), true);
  });
});

test("removes a detached worktree sitting on a merged pull request's tip and keeps one elsewhere", () => {
  withFixture((f) => {
    const merged = f.worktree("merged");
    f.merge("merged");
    const detachedDone = join(f.main, ".claude", "worktrees", "detached-done");
    git(f.main, "worktree", "add", "-q", "--detach", detachedDone, "merged");
    git(f.main, "worktree", "remove", merged);
    const open = f.worktree("open");
    const detachedOpen = join(f.main, ".claude", "worktrees", "detached-open");
    git(f.main, "worktree", "add", "-q", "--detach", detachedOpen, "open");
    const result = f.run(f.session());
    assert.deepEqual(result.removed.map((r) => r.path), [detachedDone]);
    assert.equal(f.exists(detachedOpen), true);
    assert.equal(f.exists(open), true);
  });
});

test("keeps a locked worktree", () => {
  withFixture((f) => {
    const locked = f.worktree("locked");
    f.merge("locked");
    git(f.main, "worktree", "lock", locked);
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(locked), true);
  });
});

test("never removes the worktree it runs in, even when merged and clean", () => {
  withFixture((f) => {
    const mine = f.worktree("mine");
    f.merge("mine");
    const result = f.run(mine);
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(mine), true);
  });
});

test("never touches the main checkout or a worktree outside .claude/worktrees", () => {
  withFixture((f) => {
    const elsewhere = join(f.base, "elsewhere");
    git(f.main, "worktree", "add", "-q", elsewhere, "-b", "elsewhere", "origin/dev");
    commit(elsewhere, "e.txt", "work");
    f.merge("elsewhere");
    const result = f.run(f.session());
    assert.deepEqual(result.removed, []);
    assert.equal(f.exists(elsewhere), true);
    assert.equal(f.exists(f.main), true);
  });
});

test("a dry run reports what it would remove and removes nothing", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    f.merge("done");
    const result = f.run(f.session(), { dryRun: true });
    assert.deepEqual(result.removed.map((r) => r.path), [done]);
    assert.equal(f.exists(done), true);
  });
});

test("does nothing when origin/dev is unknown", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    f.merge("done");
    git(f.main, "update-ref", "-d", "refs/remotes/origin/dev");
    const result = f.run(done);
    assert.deepEqual(result.removed, []);
  });
});

const GB = 1024 ** 3;
const caches = () => [
  { name: "Xcode DerivedData", bytes: 41 * GB },
  { name: "Docker images, volumes and build cache", bytes: 27 * GB },
  { name: "Gradle caches", bytes: 10 * GB },
  { name: "Android emulators and SDK", bytes: 3 * GB },
  { name: "Empty cache", bytes: 0 },
];

test("below 20 GB free, a warning names the free space and the largest caches by kind, with no path", () => {
  const lines = [];
  reportLowDisk(12 * GB, { measure: caches, log: (line) => lines.push(line) });
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Low disk: 12 GB free, below 20 GB/);
  assert.match(lines[0], /Largest caches: Xcode DerivedData 41 GB, Docker images, volumes and build cache 27 GB, Gradle caches 10 GB\./);
  assert.doesNotMatch(lines[0], /Android|Empty cache/, "only the three largest are named");
  assert.doesNotMatch(lines[0], /\/Users|\/home|~\//);
});

test("at or above 20 GB free, nothing is printed and no cache is measured", () => {
  for (const free of [20 * GB, 200 * GB]) {
    const lines = [];
    reportLowDisk(free, { measure: () => assert.fail("measured with room to spare"), log: (line) => lines.push(line) });
    assert.deepEqual(lines, []);
  }
});

test("a disk whose free space cannot be read prints nothing", () => {
  assert.equal(lowDiskWarning(undefined, caches), undefined);
});

test("a warning with every cache unmeasurable still says the disk is low", () => {
  assert.match(lowDiskWarning(5 * GB, () => []), /^Low disk: 5 GB free/);
});

test("removing a merged worktree removes its own DerivedData and leaves another worktree's and Xcode's shared caches", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    const sibling = f.worktree("done-2");
    f.merge("done");
    git(f.main, "fetch", "-q", "origin");
    const mine = f.build(join(done, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-aaa");
    const alsoMine = f.build(join(done, "mobile", "ios", "Other.xcworkspace"), "Other-bbb");
    const theirs = f.build(join(sibling, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-ccc");
    const shared = join(f.derivedData, "ModuleCache.noindex");
    mkdirSync(shared);
    const result = f.run(f.session());
    assert.deepEqual(result.removed.map((r) => r.path), [done]);
    assert.equal(f.exists(mine), false);
    assert.equal(f.exists(alsoMine), false);
    assert.equal(f.exists(theirs), true, "a worktree whose name starts with the removed one's is another worktree");
    assert.equal(f.exists(shared), true);
  });
});

test("a kept worktree keeps its DerivedData", () => {
  withFixture((f) => {
    const open = f.worktree("open");
    const build = f.build(join(open, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-aaa");
    f.run(f.session());
    assert.equal(f.exists(build), true);
  });
});

test("a dry run leaves DerivedData alone", () => {
  withFixture((f) => {
    const done = f.worktree("done");
    f.merge("done");
    const build = f.build(join(done, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-aaa");
    f.run(f.session(), { dryRun: true });
    assert.equal(f.exists(build), true);
  });
});

test("removeDerivedData finds a worktree that is already gone by its recorded path, as the manual teardown runs it", () => {
  withFixture((f) => {
    const gone = f.worktree("gone");
    const keep = f.worktree("keep");
    const goneBuild = f.build(join(gone, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-aaa");
    const keepBuild = f.build(join(keep, "mobile", "ios", "Kalia.xcworkspace"), "Kalia-bbb");
    git(f.main, "worktree", "remove", "--force", gone);
    assert.deepEqual(removeDerivedData(gone, { derivedData: f.derivedData }), [goneBuild]);
    assert.equal(f.exists(goneBuild), false);
    assert.equal(f.exists(keepBuild), true);
  });
});

test("removeDerivedData does nothing when Xcode has never built here", () => {
  assert.deepEqual(removeDerivedData("/nowhere/at/all", { derivedData: join(tmpdir(), "no-such-derived-data") }), []);
});
