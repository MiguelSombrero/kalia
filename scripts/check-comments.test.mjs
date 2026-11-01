#!/usr/bin/env node
// Fixture-driven self-test for check-comments.mjs. The real tree passes the
// hard tier, so without this a checker that stopped looking at a directory
// would stay green; the mobile case is the one that did not exist before
// mobile/src joined the scan.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkComments } from "./check-comments.mjs";

function check(files, assertions) {
  const root = mkdtempSync(resolve(tmpdir(), "comments-check-"));
  try {
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(resolve(root, dirname(rel)), { recursive: true });
      writeFileSync(resolve(root, rel), text);
    }
    assertions(checkComments(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("fails a process-narration comment in a mobile file and names it", () => {
  check(
    { "mobile/src/lib/greet.ts": "// Added in task 12.\nexport const greet = () => 1;\n" },
    ({ failures }) => {
      assert.equal(failures.length, 1);
      assert.equal(failures[0].file, "mobile/src/lib/greet.ts");
      assert.equal(failures[0].line, 1);
      assert.match(failures[0].msg, /task N/);
    },
  );
});

test("scans a mobile .tsx file", () => {
  check(
    { "mobile/src/ui/Card.tsx": "// Renamed from Tile.\nexport const Card = () => null;\n" },
    ({ failures }) => assert.equal(failures.length, 1),
  );
});

test("passes a mobile file whose comment is not process narration", () => {
  check(
    {
      "mobile/src/lib/greet.ts":
        "// React Native's URL has no hostname.\nexport const greet = () => 1;\n",
    },
    ({ failures, fileCount }) => {
      assert.deepEqual(failures, []);
      assert.equal(fileCount, 1);
    },
  );
});

test("leaves mobile outside src alone", () => {
  check(
    { "mobile/scripts/tool.ts": "// Added in task 12.\nexport const x = 1;\n" },
    ({ failures, fileCount }) => {
      assert.deepEqual(failures, []);
      assert.equal(fileCount, 0);
    },
  );
});

test("still fails a backend comment and skips the generated API client", () => {
  check(
    {
      "backend/src/A.java": "// see iteration 3\nclass A {}\n",
      "packages/api/src/generated/client.ts": "// task 1\nexport const x = 1;\n",
    },
    ({ failures }) => {
      assert.equal(failures.length, 1);
      assert.equal(failures[0].file, "backend/src/A.java");
    },
  );
});
