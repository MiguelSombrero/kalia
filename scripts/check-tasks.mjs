#!/usr/bin/env node
// Guards the drift ADR-0026 found by hand: tasks were one-line list items
// with no acceptance criteria, tests lived in a task of their own, and the
// iteration files had grown two different ways of grouping tasks. Sibling of
// check-adrs.mjs, same shape and same no-dependency constraint so it runs in
// CI without an npm install.
//
// Scope is opt-in by construction: an iteration is checked only once a
// docs/tasks/iteration-N/ directory exists. Iterations 0-4 predate the format
// and have none, so they are exempt without needing a list of exceptions
// here — the same partial adoption check-adrs.mjs uses for pre-template ADRs.
//
// The rules that are not merely structural, each tracing to an observed
// failure (ADR-0026's Evidence):
//   - every task needs at least one acceptance criterion, and at least one
//     of them has to be an automated test;
//   - a task cannot be `done` with an unchecked criterion;
//   - a task agreed with the product owner (`refined` onward) cannot still
//     hold an unanswered question. The gate on *starting* work is the status
//     itself — a task begins at `needs-refinement` and only the product owner
//     moves it on — which no script can verify, since it cannot see who wrote
//     the line; the PR that changes it is what does.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TASKS_DIR = resolve(ROOT, "docs/tasks");

const STATUS_TOKENS = ["needs-refinement", "refined", "in-progress", "done", "dropped"];
// `needs-refinement` is where a task starts and is allowed to hold open
// questions; `dropped` is abandoned. Everything between them has been agreed
// with the product owner, so a dangling question there is a contradiction.
const RESOLVED_STATUSES = ["refined", "in-progress", "done"];
const CANONICAL_ORDER = [
  "Why",
  "Scope",
  "Non-goals",
  "Constraints",
  "Open questions",
  "Acceptance criteria",
  "Notes",
];
const REQUIRED = ["Why", "Scope", "Constraints", "Open questions", "Acceptance criteria"];
// Deliberately loose, like check-adrs.mjs's /\b(Bad|Neutral),/ — it catches
// the task that forgot tests entirely, not the one that worded them oddly.
const TEST_SHAPED = /\b(test|spec|playwright|vitest|e2e)\b/i;

let failures = 0;
const fail = (file, msg) => { console.log(`  FAIL  ${file}: ${msg}`); failures++; };

/** The slice of `text` under `## heading`, up to the next `## `. */
const sectionOf = (text, heading) => {
  // Anchored to a line start so prose that names a heading in passing (e.g.
  // "under `## Open questions`") can't be mistaken for the heading itself.
  const match = new RegExp(`^## ${heading}$`, "m").exec(text);
  if (!match) return null;
  const start = match.index;
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
};

const iterations = readdirSync(TASKS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && /^iteration-\d+$/.test(e.name))
  .map((e) => e.name)
  .sort();

if (iterations.length === 0) {
  console.log("No templated iterations yet (no docs/tasks/iteration-N/ directory) — nothing to check\n");
  process.exit(0);
}

console.log(`Checking ${iterations.length} templated iteration(s) in docs/tasks/\n`);

for (const iteration of iterations) {
  const indexPath = resolve(TASKS_DIR, `${iteration}.md`);
  if (!existsSync(indexPath)) {
    fail(`docs/tasks/${iteration}/`, `has no index file docs/tasks/${iteration}.md`);
    continue;
  }
  const indexText = readFileSync(indexPath, "utf8");
  const indexName = `docs/tasks/${iteration}.md`;

  for (const heading of ["Done when", "Tasks"]) {
    if (!indexText.includes(`## ${heading}`)) fail(indexName, `no '## ${heading}' section`);
  }

  const taskFiles = readdirSync(resolve(TASKS_DIR, iteration))
    .filter((f) => /^\d{2}-.*\.md$/.test(f))
    .sort();
  if (taskFiles.length === 0) fail(`docs/tasks/${iteration}/`, "contains no NN-slug.md task files");

  const rows = indexText.split("\n").filter((l) => l.startsWith("|") && l.includes(`${iteration}/`));

  for (const file of taskFiles) {
    const name = `docs/tasks/${iteration}/${file}`;
    const text = readFileSync(resolve(TASKS_DIR, iteration, file), "utf8");

    const h1 = text.match(/^# Task (\d{2}): (.+)$/m);
    if (!h1) { fail(name, "no H1 matching '# Task NN: Title'"); continue; }
    const [, id, title] = h1;
    if (!file.startsWith(`${id}-`)) fail(name, `H1 id "${id}" does not match the filename`);

    const status = text.match(/^- \*\*Status:\*\* (.+)$/m)?.[1];
    if (!status) fail(name, "no '- **Status:** ...' metadata line");
    else if (!STATUS_TOKENS.includes(status)) {
      fail(name, `Status "${status}" is not one of: ${STATUS_TOKENS.join(", ")}`);
    }

    const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const unknown = headings.filter((h) => !CANONICAL_ORDER.includes(h));
    if (unknown.length > 0) {
      fail(name, `heading(s) not in the template's vocabulary: ${unknown.join(", ")}`);
    }
    const known = headings.filter((h) => CANONICAL_ORDER.includes(h));
    const expectedOrder = CANONICAL_ORDER.filter((h) => known.includes(h));
    if (known.join("|") !== expectedOrder.join("|")) {
      fail(name, `headings out of canonical order: got [${known.join(", ")}], want [${expectedOrder.join(", ")}]`);
    }
    for (const heading of REQUIRED) {
      if (!known.includes(heading)) fail(name, `required section '## ${heading}' is missing`);
    }

    const acceptance = sectionOf(text, "Acceptance criteria");
    if (acceptance) {
      const boxes = [...acceptance.matchAll(/^\s*- \[([ x])\]/gm)].map((m) => m[1]);
      if (boxes.length === 0) {
        fail(name, "Acceptance criteria has no '- [ ]' checkbox");
      } else {
        if (!TEST_SHAPED.test(acceptance)) {
          fail(name, "no acceptance criterion mentions an automated test (ADR-0026)");
        }
        if (status === "done" && boxes.includes(" ")) {
          fail(name, `Status is "done" but ${boxes.filter((b) => b === " ").length} criterion/criteria are unchecked`);
        }
      }
    }

    const open = sectionOf(text, "Open questions");
    if (open && RESOLVED_STATUSES.includes(status)) {
      const body = open.replace(/^## Open questions/, "").trim();
      if (!/^\*\*None\.\*\*/.test(body)) {
        fail(name, `Status is "${status}" but Open questions is not resolved to '**None.**'`);
      }
    }

    const row = rows.find((l) => l.includes(`${iteration}/${file})`));
    if (!row) {
      fail(name, `no row in ${indexName}'s '## Tasks' table`);
    } else {
      const cells = row.split("|").map((c) => c.trim());
      // | [NN](iteration-N/NN-slug.md) | Title | Status |
      if (cells[2] !== title) fail(name, `index title "${cells[2]}" does not match H1 "${title}"`);
      if (status && cells[3] !== status) {
        fail(name, `index status "${cells[3]}" does not match file status "${status}"`);
      }
    }
  }

  // Every row must correspond to a file — catches a row surviving a rename.
  for (const row of rows) {
    const linked = row.match(new RegExp(`${iteration}/(\\d{2}-[^)]+\\.md)`))?.[1];
    if (linked && !taskFiles.includes(linked)) {
      fail(indexName, `'## Tasks' row links ${iteration}/${linked}, which does not exist`);
    }
  }
}

console.log(failures === 0 ? "\nOK\n" : `\n${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
