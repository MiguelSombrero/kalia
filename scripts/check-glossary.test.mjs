#!/usr/bin/env node
// Fixture-driven self-test for check-glossary.mjs. The check it exercises
// never fires against the real tree once the glossary is current, so without
// this a broken checker would stay green forever (iteration 6 task 08). Runs
// in CI beside `node scripts/check-glossary.mjs` — see the glossary-check
// job and `make check`.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkGlossary } from "./check-glossary.mjs";

const DOMAIN_PKG = "backend/src/main/java/fi/kalia/sample/domain";

function fixture(glossaryBody) {
  const root = mkdtempSync(resolve(tmpdir(), "glossary-check-"));
  mkdirSync(resolve(root, DOMAIN_PKG), { recursive: true });
  mkdirSync(resolve(root, "docs"), { recursive: true });
  writeFileSync(
    resolve(root, DOMAIN_PKG, "Widget.java"),
    "package fi.kalia.sample.domain;\npublic class Widget {}\n",
  );
  writeFileSync(
    resolve(root, DOMAIN_PKG, "package-info.java"),
    "package fi.kalia.sample.domain;\n",
  );
  writeFileSync(resolve(root, "docs/glossary.md"), glossaryBody);
  return root;
}

const withEntry = [
  "# Glossary fixture",
  "",
  "## sample",
  "",
  "### Domain types (`fi.kalia.sample.domain`)",
  "",
  "| Type | Meaning | Why |",
  "|---|---|---|",
  "| `Widget` | A sample thing | none |",
  "",
].join("\n");

test("passes when every domain type has a row", () => {
  const root = fixture(withEntry);
  try {
    assert.deepEqual(checkGlossary(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when an entry is removed", () => {
  const root = fixture(withEntry.replace("| `Widget` | A sample thing | none |\n", ""));
  try {
    const failures = checkGlossary(root);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /Widget.*no glossary entry/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when the Domain types table is absent entirely", () => {
  const root = fixture("# Glossary fixture\n\n## sample\n\nNo table here.\n");
  try {
    const failures = checkGlossary(root);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no "### Domain types/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails when the table lists a type that does not exist", () => {
  const root = fixture(
    withEntry.replace(
      "| `Widget` | A sample thing | none |",
      "| `Widget` | A sample thing | none |\n| `Gone` | Removed type | none |",
    ),
  );
  try {
    const failures = checkGlossary(root);
    assert.equal(failures.length, 1);
    assert.match(failures[0], /lists `Gone`, which is not a type/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the real repository glossary is current", () => {
  const root = resolve(import.meta.dirname, "..");
  assert.deepEqual(checkGlossary(root), []);
});
