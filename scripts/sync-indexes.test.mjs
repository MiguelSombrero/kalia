#!/usr/bin/env node
// Fixture-driven self-test for sync-indexes.mjs. The real tree is in sync
// after every run, so only a fixture with stale cells shows what the sync
// rewrites and, as much to the point, what it leaves alone. Runs in
// `make check`, hence CI.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { syncIndexes } from "./sync-indexes.mjs";

const lines = (...l) => l.join("\n") + "\n";

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "sync-indexes-"));
  mkdirSync(resolve(root, "docs/adr"), { recursive: true });
  mkdirSync(resolve(root, "docs/tasks/iteration-1"), { recursive: true });
  const write = (path, text) => writeFileSync(resolve(root, path), text);

  write("docs/adr/0001-first.md", lines("# ADR-0001: First, renamed", "", "- **Status:** superseded", "- **Date:** 2026-01-02"));
  write("docs/adr/0002-second.md", lines("# ADR-0002: Second", "", "- **Status:** accepted", "- **Date:** 2026-01-03"));
  write(
    "docs/architecture.md",
    lines(
      "## 7. Testing",
      "",
      "| Area | Decided in |",
      "|---|---|",
      "| [ADR-0001](adr/0001-first.md) | not an index row |",
      "",
      "## 9. Architecture decision records",
      "",
      "### Process",
      "",
      "| Id | Title | Status | Date |",
      "|---|---|---|---|",
      "| [ADR-0002](adr/0002-second.md) | Second | accepted | 2026-01-03 |",
      "| [ADR-0001](adr/0001-first.md) | First | accepted | 2026-01-01 |",
    ),
  );

  write("docs/tasks/iteration-1/01-alpha.md", lines("# Task 01: Alpha", "", "- **Status:** done"));
  write("docs/tasks/iteration-1/02-beta.md", lines("# Task 02: Beta | with a pipe", "", "- **Status:** refined"));
  write("docs/tasks/iteration-1/03-gamma.md", lines("# Task 03: Gamma", "", "- **Status:** refined"));
  write(
    "docs/tasks/iteration-1.md",
    lines(
      "## Tasks",
      "",
      "| ID | Task | Status |",
      "|---|---|---|",
      "| [02](iteration-1/02-beta.md) | Beta | needs-refinement |",
      "| [01](iteration-1/01-alpha.md) | Alpha | in-progress |",
    ),
  );
  return root;
}

test("rewrites each stale cell from the file it mirrors, keeping row order", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const stale = Object.fromEntries(syncIndexes(root).map(({ path, text }) => [path, text]));

  assert.deepEqual(Object.keys(stale).sort(), ["docs/architecture.md", "docs/tasks/iteration-1.md"]);
  assert.match(
    stale["docs/architecture.md"],
    /\| \[ADR-0002\]\(adr\/0002-second\.md\) \| Second \| accepted \| 2026-01-03 \|\n\| \[ADR-0001\]\(adr\/0001-first\.md\) \| First, renamed \| superseded \| 2026-01-02 \|/,
  );
  assert.match(
    stale["docs/tasks/iteration-1.md"],
    /\| \[02\]\(iteration-1\/02-beta\.md\) \| Beta \\\| with a pipe \| refined \|\n\| \[01\]\(iteration-1\/01-alpha\.md\) \| Alpha \| done \|/,
  );
});

test("leaves a link outside the ADR index alone, and adds no row for a file that has none", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const stale = Object.fromEntries(syncIndexes(root).map(({ path, text }) => [path, text]));

  assert.match(stale["docs/architecture.md"], /\| \[ADR-0001\]\(adr\/0001-first\.md\) \| not an index row \|/);
  assert.doesNotMatch(stale["docs/tasks/iteration-1.md"], /03-gamma/);
});

test("reports nothing once the cells match", (t) => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));

  for (const { path, text } of syncIndexes(root)) writeFileSync(resolve(root, path), text);

  assert.deepEqual(syncIndexes(root), []);
});
