#!/usr/bin/env node
// Fixture-driven self-test for check-adrs.mjs. The real tree passes, so only a
// fixture with a missing, stale or extra index row shows that each is refused.
// Runs in `make check`, hence CI.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkAdrs } from "./check-adrs.mjs";

const lines = (...l) => l.join("\n") + "\n";

const adr = (n, title) =>
  lines(
    `# ADR-000${n}: ${title}`,
    "",
    "- **Status:** accepted",
    "- **Date:** 2026-01-0" + n,
    "",
    "## Context",
    "",
    "Why.",
    "",
    "## Decision",
    "",
    "What.",
  );

function fixture({ subjects = ["0001-first.md", "0002-second.md"], rows = ["0001-first.md", "0002-second.md"] } = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "check-adrs-"));
  mkdirSync(resolve(root, "docs/adr"), { recursive: true });
  const write = (path, text) => writeFileSync(resolve(root, path), text);
  write("docs/adr/0001-first.md", adr(1, "First"));
  write("docs/adr/0002-second.md", adr(2, "Second"));
  write(
    "docs/adr/README.md",
    lines(
      "# Architecture decision records",
      "",
      "## Subjects",
      "",
      ...subjects.map((f) => `- [ADR-${f.slice(0, 4)}](${f}) — gloss`),
      "",
      "## All ADRs by number",
      "",
      "| Id | Title | Status | Date |",
      "|---|---|---|---|",
      ...rows.map((f) => `| [ADR-${f.slice(0, 4)}](${f}) | Title | accepted | 2026-01-01 |`),
    ),
  );
  return root;
}

const messages = (root) => checkAdrs(root).failures.map((f) => `${f.file}: ${f.msg}`);

test("passes a tree whose every ADR has a row and a subject entry", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(messages(root), []);
});

test("refuses an ADR with no row in the table", (t) => {
  const root = fixture({ rows: ["0001-first.md"] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.match(messages(root).join("\n"), /0002-second\.md: no row in docs\/adr\/README\.md/);
});

test("a subject-section link is not an index row", (t) => {
  const root = fixture({ rows: [] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(messages(root).filter((m) => /no row in/.test(m)).length, 2);
});

test("refuses an ADR missing from the subject sections", (t) => {
  const root = fixture({ subjects: ["0001-first.md"] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.match(messages(root).join("\n"), /0002-second\.md: not listed in a subject section/);
});

test("refuses a row whose ADR file does not exist", (t) => {
  const root = fixture({ rows: ["0001-first.md", "0002-second.md", "0009-gone.md"] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.match(messages(root).join("\n"), /index row for ADR-0009 has no corresponding file/);
});

test("refuses a README with no index heading", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(resolve(root, "docs/adr/README.md"), "# Architecture decision records\n");
  assert.match(messages(root).join("\n"), /no '## All ADRs by number' heading/);
});
