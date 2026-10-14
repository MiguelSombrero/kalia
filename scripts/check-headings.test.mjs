#!/usr/bin/env node
// Fixture self-test for check-headings.mjs: the real tree passes the check, so
// without fixtures a checker that matched nothing would stay green.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkHeadings } from "./check-headings.mjs";

/** Builds a throwaway repository from `files` (path relative to the root → text). */
function run(files, allowlist = []) {
  const root = mkdtempSync(resolve(tmpdir(), "headings-check-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(resolve(root, path)), { recursive: true });
      writeFileSync(resolve(root, path), text);
    }
    return checkHeadings(root, allowlist);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const page = (jsx) => `export const P = () => (\n  ${jsx}\n);\n`;

test("a page built from PageTitle and SectionHeading passes", () => {
  const failures = run({
    "frontend/app/[locale]/x/page.tsx": page('<><PageTitle>T</PageTitle><SectionHeading level={2} look="label">S</SectionHeading></>'),
  });
  assert.deepEqual(failures, []);
});

test("a hand-written <h1> fails, with or without attributes", () => {
  for (const jsx of ["<h1>T</h1>", '<h1 className="font-display">T</h1>', "<h1\n    id=\"t\">T</h1>"]) {
    const failures = run({ "frontend/app/[locale]/x/page.tsx": page(jsx) });
    assert.equal(failures.length, 1, jsx);
    assert.match(failures[0], /^frontend\/app\/\[locale\]\/x\/page\.tsx:2: .*<h1>.*PageTitle/);
  }
});

test("a hand-written <h2> in a feature fails and names SectionHeading", () => {
  const failures = run({ "frontend/features/f/View.tsx": page('<h2 className="text-2xl font-bold">S</h2>') });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /features\/f\/View\.tsx:2: .*<h2>.*SectionHeading/);
});

test("h3 and deeper, and tags that only start with h1 or h2, pass", () => {
  const failures = run({ "frontend/features/f/View.tsx": page("<><h3>a</h3><h4>b</h4><h1x /><h2Thing /></>") });
  assert.deepEqual(failures, []);
});

test("a heading inside a comment passes, and line numbers survive a block comment", () => {
  assert.deepEqual(run({ "frontend/features/f/View.tsx": page("<>{/* was <h2> */}</>") + "// an <h1> here\n" }), []);
  const failures = run({ "frontend/features/f/View.tsx": "/*\n * <h1>\n */\n" + page("<h2>S</h2>") });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /View\.tsx:5: /);
});

test("components/ui/, test files and files outside app/ and features/ are not read", () => {
  const failures = run({
    "frontend/components/ui/page-title.tsx": page("<h1>T</h1>"),
    "frontend/features/f/View.test.tsx": page("<h2>S</h2>"),
    "frontend/lib/x.tsx": page("<h2>S</h2>"),
  });
  assert.deepEqual(failures, []);
});

test("an allowlist entry excuses exactly one element of its tag in its file", () => {
  const allowlist = [{ path: "frontend/features/f/Row.tsx", tag: "h2", reason: "a row's own name" }];
  assert.deepEqual(run({ "frontend/features/f/Row.tsx": page("<h2>Name</h2>") }, allowlist), []);

  const twice = run({ "frontend/features/f/Row.tsx": page("<><h2>A</h2><h2>B</h2></>") }, allowlist);
  assert.equal(twice.length, 1);

  const otherTag = run({ "frontend/features/f/Row.tsx": page("<><h2>A</h2><h1>B</h1></>") }, allowlist);
  assert.equal(otherTag.length, 1);
  assert.match(otherTag[0], /<h1>/);
});

test("an allowlist entry that excuses nothing fails", () => {
  const allowlist = [{ path: "frontend/features/f/Row.tsx", tag: "h2", reason: "a row's own name" }];
  const failures = run({ "frontend/features/f/Row.tsx": page("<h3>Name</h3>") }, allowlist);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /excuses nothing/);
});

test("the repository passes with its own allowlist", () => {
  assert.deepEqual(checkHeadings(resolve(import.meta.dirname, "..")), []);
});
