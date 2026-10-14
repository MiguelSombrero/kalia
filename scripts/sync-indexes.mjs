#!/usr/bin/env node
// Rewrites the cells of the index tables that mirror a file — an ADR's title,
// status and date in docs/architecture.md, a task's title and status in its
// iteration's `## Tasks` table — from that file (ADR-0076). Plain Node with no
// dependencies, like the check-*.mjs checkers.
//
// Only rows that already exist change. Which of the two ADR tables a row sits
// in, and the order of an iteration's rows, carry meaning no file holds, so
// adding a row stays a hand step that check-adrs.mjs and check-tasks.mjs fail
// when it is missed.
//
// Writes by default. `--check` writes nothing and exits non-zero when a cell
// is out of date, which is how `make check` runs it.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { templatedIterations } from "./check-tasks.mjs";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const ADR_INDEX_HEADING = /^## \d+\. Architecture decision records$/m;
const ADR_ROW = /^\| (\[ADR-\d{4}\]\(adr\/([^)]+)\)) \|.*\|$/;
const TASK_ROW = /^\| (\[\d{2}\]\((iteration-\d+(?:\.\d+)?\/[^)]+)\)) \|.*\|$/;

const field = (text, name) => text.match(new RegExp(`^- \\*\\*${name}:\\*\\* (.+)$`, "m"))?.[1]?.trim();
const row = (link, cells) => `| ${link} | ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;

/**
 * @param {string} root repository root to sync
 * @returns {{ path: string, text: string }[]} each index file whose cells are out of date, with its synced text
 */
export function syncIndexes(root) {
  const stale = [];

  const adrDir = resolve(root, "docs/adr");
  const adrs = new Map();
  for (const file of readdirSync(adrDir).filter((f) => /^\d{4}-.*\.md$/.test(f))) {
    const text = readFileSync(resolve(adrDir, file), "utf8");
    const cells = [text.match(/^# ADR-\d{4}: (.+)$/m)?.[1], field(text, "Status"), field(text, "Date")];
    if (cells.every(Boolean)) adrs.set(file, cells);
  }
  // Only from the index heading on: architecture.md links ADRs from other
  // tables too, which are not mirrors of anything.
  syncRows(root, "docs/architecture.md", stale, ADR_INDEX_HEADING, (line) => {
    const match = line.match(ADR_ROW);
    const cells = match && adrs.get(match[2]);
    return cells ? row(match[1], cells) : line;
  });

  for (const iteration of templatedIterations(root)) {
    const dir = resolve(root, "docs/tasks", iteration);
    const tasks = new Map();
    for (const file of readdirSync(dir).filter((f) => /^\d{2}-.*\.md$/.test(f))) {
      const text = readFileSync(resolve(dir, file), "utf8");
      const cells = [text.match(/^# Task \d{2}: (.+)$/m)?.[1], field(text, "Status")];
      if (cells.every(Boolean)) tasks.set(`${iteration}/${file}`, cells);
    }
    syncRows(root, `docs/tasks/${iteration}.md`, stale, /^/, (line) => {
      const match = line.match(TASK_ROW);
      const cells = match && tasks.get(match[2]);
      return cells ? row(match[1], cells) : line;
    });
  }

  return stale;
}

function syncRows(root, path, stale, from, rewrite) {
  const full = resolve(root, path);
  if (!existsSync(full)) return;
  const text = readFileSync(full, "utf8");
  const start = text.search(from);
  if (start === -1) return;
  const synced = text.slice(0, start) + text.slice(start).split("\n").map(rewrite).join("\n");
  if (synced !== text) stale.push({ path, text: synced });
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(SELF_DIR, "..");
  const check = process.argv.includes("--check");
  const stale = syncIndexes(root);
  for (const { path, text } of stale) {
    if (check) console.log(`  FAIL  ${path}: an index cell disagrees with the file it mirrors`);
    else writeFileSync(resolve(root, path), text);
  }
  if (check && stale.length > 0) {
    console.log("\nRun `node scripts/sync-indexes.mjs` to copy each file's title and status into its row.\n");
    process.exit(1);
  }
  console.log(check ? "Index cells match their files\n" : `Synced ${stale.length} index file(s)\n`);
}
