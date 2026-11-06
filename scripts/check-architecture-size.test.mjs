#!/usr/bin/env node
// Self-test for check-architecture-size.mjs: the cap is exactly 500 lines, so
// a 500-line document passes and a 501-line one does not. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { lineCount, MAX_LINES } from "./check-architecture-size.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "check-architecture-size.mjs");
const document = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n") + "\n";

function run(lines, t) {
  const root = mkdtempSync(resolve(tmpdir(), "arch-size-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(resolve(root, "scripts"));
  mkdirSync(resolve(root, "docs"));
  copyFileSync(SCRIPT, resolve(root, "scripts/check-architecture-size.mjs"));
  writeFileSync(resolve(root, "docs/architecture.md"), document(lines));
  return spawnSync(process.execPath, [resolve(root, "scripts/check-architecture-size.mjs")], { encoding: "utf8" });
}

test("counts lines as wc -l does", () => {
  assert.equal(lineCount(""), 0);
  assert.equal(lineCount("a\nb\n"), 2);
  assert.equal(lineCount("a\nb"), 2);
});

test("passes a document of exactly the cap", (t) => {
  assert.equal(MAX_LINES, 500);
  const result = run(500, t);
  assert.equal(result.status, 0, result.stdout);
});

test("fails a document one line over the cap and says by how much", (t) => {
  const result = run(501, t);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /501 lines, 1 over the cap/);
});
