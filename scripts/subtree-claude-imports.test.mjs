#!/usr/bin/env node
// Each app's CLAUDE.md is loaded when a session touches that subtree, and the
// conventions reach the session only through its `@` imports (ADR-0035). A
// missing import fails silently: the session works without the conventions and
// finds out at review. Runs in `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SUBTREES = ["backend", "web", "mobile"];
const REQUIRED = ["README.md", "CONVENTIONS.md"];

/**
 * @param {string} claudeMd the text of a subtree's CLAUDE.md
 * @returns {string[]} the required files it does not import, each as an `@` line of its own
 */
export function missingImports(claudeMd) {
  const lines = new Set(claudeMd.split("\n").map((line) => line.trim()));
  return REQUIRED.filter((file) => !lines.has(`@${file}`));
}

test("a CLAUDE.md importing both files is complete", () => {
  assert.deepEqual(missingImports("@README.md\n@CONVENTIONS.md\n\nprose\n"), []);
});

for (const file of REQUIRED) {
  test(`a CLAUDE.md without the ${file} import is reported`, () => {
    const others = REQUIRED.filter((f) => f !== file).map((f) => `@${f}`);
    assert.deepEqual(missingImports(`${others.join("\n")}\n`), [file]);
  });
}

test("a mention in prose is not an import", () => {
  assert.deepEqual(missingImports("see @README.md and @CONVENTIONS.md inline\n"), REQUIRED);
});

for (const subtree of SUBTREES) {
  test(`${subtree}/CLAUDE.md imports its README and its CONVENTIONS.md`, () => {
    const text = readFileSync(resolve(ROOT, subtree, "CLAUDE.md"), "utf8");
    assert.deepEqual(missingImports(text), [], `${subtree}/CLAUDE.md is missing an @ import line`);
  });

  test(`${subtree}/CONVENTIONS.md exists`, () => {
    assert.ok(readFileSync(resolve(ROOT, subtree, "CONVENTIONS.md"), "utf8").length > 0);
  });
}
