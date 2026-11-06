#!/usr/bin/env node
// Self-test for check-doc-size.mjs: each cap is exact, so a document of
// exactly its cap passes and one line more does not. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { lineCount, CAPS } from "./check-doc-size.mjs";

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "check-doc-size.mjs");
const document = (n) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join("\n") + "\n";

function run(lines, t) {
  const root = mkdtempSync(resolve(tmpdir(), "doc-size-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ["scripts", "docs", "backend"]) mkdirSync(resolve(root, dir));
  copyFileSync(SCRIPT, resolve(root, "scripts/check-doc-size.mjs"));
  for (const file of Object.keys(CAPS)) {
    writeFileSync(resolve(root, file), document(lines[file] ?? CAPS[file]));
  }
  return spawnSync(process.execPath, [resolve(root, "scripts/check-doc-size.mjs")], { encoding: "utf8" });
}

test("counts lines as wc -l does", () => {
  assert.equal(lineCount(""), 0);
  assert.equal(lineCount("a\nb\n"), 2);
  assert.equal(lineCount("a\nb"), 2);
});

test("caps are 500 for architecture.md and 300 for backend/README.md", () => {
  assert.deepEqual(CAPS, { "docs/architecture.md": 500, "backend/README.md": 300 });
});

test("passes documents of exactly their caps", (t) => {
  const result = run({}, t);
  assert.equal(result.status, 0, result.stdout);
});

for (const file of Object.keys(CAPS)) {
  test(`fails ${file} one line over its cap and says by how much`, (t) => {
    const result = run({ [file]: CAPS[file] + 1 }, t);
    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes(`FAIL  ${file}: ${CAPS[file] + 1} lines, 1 over the cap`), result.stdout);
  });
}
