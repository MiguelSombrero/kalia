#!/usr/bin/env node
// Fails when a row of docs/common-failures.md has no cause kind, or records a
// repository defect that is neither marked fixed nor owned (ADR-0084). The log
// is the evidence the quality sweep counts, so a defect row that names nobody
// is a defect found once and lost, the way a bare "follow-up" in a PR
// body was. An outside cause, such as a registry outage, needs no owner:
// flagging it would train readers to ignore the check.
//
// The last column, Cause, is `external`, `defect, fixed` or `defect, <owner>`,
// where an owner is a quality-backlog ID, a link to a task file, "task N", or
// a mention of docs/ci-playbook.md. Text after that is free. Node, no
// dependencies, and a fixture self-test in check-common-failures.test.mjs.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));
const LOG = resolve(SELF_DIR, "..", "docs/common-failures.md");

const COLUMNS = ["Date", "Where", "Signature", "Why", "Cause"];
const OWNER = /\b(MUST|SHOULD|COULD)-\d+\b|\btasks\/[\w./-]+\.md\b|\btask \d+\b|\bci-playbook\.md\b/;

/** An unescaped `|` separates cells; `\|` inside a cell is part of its text. */
function cellsOf(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
}

/**
 * @param {string} cause the Cause cell of one row
 * @returns {string | null} what is wrong with it, or null when it is acceptable
 */
export function causeProblem(cause) {
  const comma = cause.indexOf(",");
  const kind = (comma === -1 ? cause : cause.slice(0, comma)).trim();
  const rest = comma === -1 ? "" : cause.slice(comma + 1).trim();
  if (kind === "external") return null;
  if (kind !== "defect") return `cause kind must start with "external" or "defect", found "${cause}"`;
  if (/^fixed\b/.test(rest) || OWNER.test(rest)) return null;
  return 'a "defect" row must say "defect, fixed" or name a quality-backlog ID, a task or a ci-playbook entry';
}

/**
 * @param {string} text the log's contents
 * @returns {string[]} one message per bad row; empty means OK
 */
export function checkLogRows(text) {
  const failures = [];
  const lines = text.split("\n");
  const header = lines.findIndex((line) => /^\|\s*Date\s*\|/.test(line));
  if (header === -1) return ["no table whose header starts with Date"];
  const heading = cellsOf(lines[header]);
  if (heading.join("|") !== COLUMNS.join("|")) {
    failures.push(`line ${header + 1}: the header must be ${COLUMNS.join(" | ")}`);
  }
  for (let i = header + 2; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) continue;
    const cells = cellsOf(lines[i]);
    const where = `line ${i + 1} (${cells[0]})`;
    if (cells.length !== COLUMNS.length) {
      failures.push(`${where}: ${cells.length} columns, expected ${COLUMNS.length}; the last is Cause`);
      continue;
    }
    const problem = causeProblem(cells[4]);
    if (problem) failures.push(`${where}: ${problem}`);
  }
  return failures;
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const failures = checkLogRows(readFileSync(LOG, "utf8"));
  console.log("Checking the cause of every row in docs/common-failures.md\n");
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
