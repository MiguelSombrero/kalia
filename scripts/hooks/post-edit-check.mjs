#!/usr/bin/env node
// PostToolUse hook: runs whichever check-*.mjs checker covers the file an
// agent just edited, and ESLint on an edited web source file, and
// reports a failure back into the agent's context while it is still working
// on that file. Why this exists at all, and why
// it reports rather than blocks: ADR-0046.
//
// The repository root is resolved from this file's own location, never from
// the session's working directory. That is the load-bearing property: each
// worktree carries its own .claude/settings.json pointing at its own copy of
// this script, so a hook can only ever check the tree it lives in — the
// failure mode (a check bound to a different worktree than the edit) that
// ADR-0046 records for /code-review cannot happen here.

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";

import { syncIndexes } from "../sync-indexes.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const WEB = resolve(ROOT, "web");
const ESLINT = resolve(ROOT, "node_modules/.bin/eslint");
const VITEST = resolve(ROOT, "node_modules/.bin/vitest");

const checker = (name) => ({
  label: `node scripts/${name}`,
  run: () => execFileSync("node", [resolve(ROOT, "scripts", name)], { cwd: ROOT, stdio: "pipe" }),
});

// Just the edited file, so the hook pays for one file's lint rather than the
// tree's. Skipped without an `npm ci` at the repository root: nothing to run it with.
const eslint = (rel) => {
  const file = rel.slice("web/".length);
  return {
    label: `eslint ${file} (in web/)`,
    run: () => existsSync(ESLINT) && execFileSync(ESLINT, [file], { cwd: WEB, stdio: "pipe" }),
  };
};

// The real tree passes eslint.config.mjs's rules, so linting it shows nothing
// about a selector broken by the edit; its self-test does.
const eslintRules = {
  label: "vitest run eslint.config.test.ts (in web/)",
  run: () =>
    existsSync(VITEST) && execFileSync(VITEST, ["run", "eslint.config.test.ts"], { cwd: WEB, stdio: "pipe" }),
};

const isWebSource = (p) => p.startsWith("web/") && /\.(tsx?|mjs)$/.test(p) && !p.includes("/node_modules/");

// Linted by its own package's `lint` script, not edit by edit; the comment
// check still reads it.
const isPackageSource = (p) =>
  p.startsWith("packages/") &&
  /\.(tsx?|mjs)$/.test(p) &&
  !p.startsWith("packages/api/src/generated/") &&
  !p.includes("/node_modules/");

// Which check owns which path. docs/architecture.md and docs/adr/ are one
// entry because check-adrs.mjs validates the ADR files against that file's
// index; docs/roadmap.md joins docs/tasks/ for the mirrored reason.
const ROUTES = [
  { check: checker("check-adrs.mjs"), covers: (p) => p.startsWith("docs/adr/") || p === "docs/architecture.md" },
  { check: checker("check-tasks.mjs"), covers: (p) => p.startsWith("docs/tasks/") || p === "docs/roadmap.md" },
  { check: checker("check-links.mjs"), covers: (p) => p.endsWith(".md") },
  {
    check: checker("check-glossary.mjs"),
    covers: (p) => p === "docs/glossary.md" || /^backend\/src\/main\/java\/fi\/kalia\/[^/]+\/domain\/[^/]+\.java$/.test(p),
  },
  {
    check: checker("check-design-tokens.mjs"),
    covers: (p) => p === "docs/design.md" || p === "web/app/globals.css",
  },
  {
    check: checker("check-contrast.mjs"),
    covers: (p) => p === "docs/design.md" || p === "web/app/globals.css",
  },
  {
    check: checker("check-keycloak-theme.mjs"),
    covers: (p) =>
      p === "web/app/globals.css" ||
      p === "web/app/icon.svg" ||
      p.startsWith("keycloak/themes/kalia/login/resources/"),
  },
  {
    check: checker("check-token-styling.mjs"),
    covers: (p) =>
      p === "web/app/globals.css" ||
      (p.startsWith("web/") &&
        /\.(tsx?|css)$/.test(p) &&
        !/\.(test|spec)\.tsx?$/.test(p) &&
        !p.startsWith("web/e2e/") &&
        !p.includes("/node_modules/")),
  },
  {
    check: checker("check-comments.mjs"),
    covers: (p) =>
      (p.startsWith("backend/src/") && p.endsWith(".java")) ||
      isWebSource(p) ||
      isPackageSource(p) ||
      (p.startsWith("scripts/") && p.endsWith(".mjs")),
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

// Before the checkers, so they judge the synced index. Writing here, unlike
// everywhere else in this hook, is safe because the cells it rewrites are
// copies with one right answer (ADR-0076).
const synced = [];
const failures = [];
if (/^docs\/(adr\/|tasks\/|architecture\.md$|roadmap\.md$)/.test(rel)) {
  try {
    for (const { path, text } of syncIndexes(ROOT)) {
      writeFileSync(resolve(ROOT, path), text);
      synced.push(path);
    }
  } catch (error) {
    failures.push(`$ node scripts/sync-indexes.mjs\n${error.message}`);
  }
}

const checks = ROUTES.filter((r) => r.covers(rel)).map((r) => r.check);
if (isWebSource(rel)) checks.push(eslint(rel));
if (rel === "web/eslint.config.mjs") checks.push(eslintRules);

for (const { label, run } of checks) {
  try {
    run();
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    failures.push(`$ ${label}\n${output.trim()}`);
  }
}
if (failures.length === 0 && synced.length === 0) process.exit(0);

// Reported, never failed. A checker legitimately goes red mid-task — a task
// file exists before its index row does — so blocking the turn would fight
// the work rather than guard it. `make verify-fast` and CI stay the gates
// that actually fail (ADR-0046).
const notes = [];
if (synced.length > 0) {
  notes.push(
    `The hook copied titles and statuses into ${synced.join(", ")} from the files they index ` +
      `(ADR-0076). Re-read a synced file before editing it, and change a title or status in its own file, never in the index.`,
  );
}
if (failures.length > 0) {
  notes.push(
    `A repository checker fails after your edit to ${rel}. Fix it before ` +
      `moving on rather than leaving it for \`make verify\` or CI:\n\n${failures.join("\n\n")}`,
  );
}
console.log(
  JSON.stringify({
    systemMessage:
      failures.length > 0
        ? `Checker failing after editing ${rel} — see the agent context for details.`
        : `Synced index cells in ${synced.join(", ")}.`,
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n\n") },
  }),
);
