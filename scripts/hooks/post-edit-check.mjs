#!/usr/bin/env node
// PostToolUse hook: runs whichever check-*.mjs checker covers the file an
// agent just edited, and reports a failure back into the agent's context
// while it is still working on that file. Why this exists at all, and why
// it reports rather than blocks: ADR-0045.
//
// The repository root is resolved from this file's own location, never from
// the session's working directory. That is the load-bearing property: each
// worktree carries its own .claude/settings.json pointing at its own copy of
// this script, so a hook can only ever check the tree it lives in — the
// failure mode (a check bound to a different worktree than the edit) that
// ADR-0045 records for /code-review cannot happen here.

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Which checker owns which path. docs/architecture.md and docs/adr/ are one
// entry because check-adrs.mjs validates the ADR files against that file's
// index; docs/roadmap.md joins docs/tasks/ for the mirrored reason.
const ROUTES = [
  { checker: "check-adrs.mjs", covers: (p) => p.startsWith("docs/adr/") || p === "docs/architecture.md" },
  { checker: "check-tasks.mjs", covers: (p) => p.startsWith("docs/tasks/") || p === "docs/roadmap.md" },
  {
    checker: "check-comments.mjs",
    covers: (p) =>
      (p.startsWith("backend/src/") && p.endsWith(".java")) ||
      (p.startsWith("frontend/") &&
        /\.tsx?$/.test(p) &&
        !p.startsWith("frontend/lib/api/generated/") &&
        !p.includes("/node_modules/")),
  },
];

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
};

const payload = JSON.parse((await readStdin()) || "{}");
const filePath = payload.tool_input?.file_path ?? payload.tool_response?.filePath;
if (!filePath) process.exit(0);

// An edit outside this tree (another worktree, a file in ~/.claude) is not
// this repository's business and must not run its checkers.
const rel = relative(ROOT, resolve(filePath));
if (rel.startsWith("..") || rel.startsWith(sep)) process.exit(0);

const checkers = ROUTES.filter((r) => r.covers(rel)).map((r) => r.checker);
if (checkers.length === 0) process.exit(0);

const failures = [];
for (const checker of checkers) {
  try {
    execFileSync("node", [resolve(ROOT, "scripts", checker)], { cwd: ROOT, stdio: "pipe" });
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    failures.push(`$ node scripts/${checker}\n${output.trim()}`);
  }
}
if (failures.length === 0) process.exit(0);

// Reported, never failed. A checker legitimately goes red mid-task — a task
// file exists before its index row does — so blocking the turn would fight
// the work rather than guard it. `make verify-fast` and CI stay the gates
// that actually fail (ADR-0045).
const report = failures.join("\n\n");
console.log(
  JSON.stringify({
    systemMessage: `Checker failing after editing ${rel} — see the agent context for details.`,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        `A repository checker fails after your edit to ${rel}. Fix it before ` +
        `moving on rather than leaving it for \`make verify\` or CI:\n\n${report}`,
    },
  }),
);
