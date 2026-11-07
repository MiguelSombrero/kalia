// A throwaway git repository for a script test that needs real history: a
// moved `dev`, a merge commit. Lives in the temp directory only, and ignores
// the caller's git configuration and the GIT_* variables a hook exports
// (`make check` runs under pre-push and would otherwise address the real
// repository).

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

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

export function makeRepo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "git-fixture-")));
  const git = (...args) =>
    execFileSync("git", args, { cwd: dir, env: GIT_ENV, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-q", "-b", "dev");
  return {
    dir,
    git,
    // Writes the file and commits it; returns the commit.
    commit(file, text, message) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), text);
      git("add", file);
      git("commit", "-q", "-m", message);
      return git("rev-parse", "HEAD");
    },
    // What GitHub's refs/pull/N/merge is: a merge commit of `branch` onto the
    // current tip of `into`, built without moving `into`, then checked out.
    mergeRef(into, branch) {
      git("checkout", "-q", "--detach", into);
      git("merge", "-q", "--no-ff", "-m", "merge ref", branch);
      return git("rev-parse", "HEAD");
    },
    remove: () => rmSync(dir, { recursive: true, force: true }),
  };
}
