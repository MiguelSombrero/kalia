#!/usr/bin/env node
// Fixture self-test for check-text-blocks.mjs. The real tree is fixed to hold
// no continuation, so the check never fires there and would stay green even if
// it stopped looking.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkBackendJava, findStringContinuations } from "./check-text-blocks.mjs";

const find = (text) => findStringContinuations("A.java", text);

test("catches a leading + continuing a literal, naming file and line", () => {
  const text = 'class A {\n  String s = "one "\n      + "two";\n}\n';
  assert.deepEqual(find(text), ['A.java:3 string literal continued with "+" across lines']);
});

test("catches a trailing + continuing a literal", () => {
  assert.equal(find('String s = "one " +\n    "two";').length, 1);
});

test("catches a continuation inside an annotation value", () => {
  assert.equal(find('@Query("select e "\n    + "from E e")\nint f();').length, 1);
});

test("allows a text block, with or without a line continuation", () => {
  const text = 'String s = """\n    one \\\n    two\n    """;\nint n = 1;\n';
  assert.deepEqual(find(text), []);
});

test("allows a text block joined to a constant", () => {
  const text = '@Parameter(description = """\n    at most \\\n    """ + MAX + """\n     rows""")\n';
  assert.deepEqual(find(text), []);
});

test("allows a literal joined to a constant on one line", () => {
  assert.deepEqual(find('String s = "page size, 1-" + MAX_PAGE_SIZE;\nint i = 0; i++; i += 2;'), []);
});

test("ignores a + quoted in a comment, a char literal, a string or a text block", () => {
  const text = [
    '// foo\n// + "bar"',
    '/* foo\n  + "bar" */',
    "char c = '+';\n String t = \"x\";",
    'String q = "a \\" + b";',
    'String block = """\n    x\n    + "y"\n    """;',
  ].join("\n");
  assert.deepEqual(find(text), []);
});

test("reports the right line after a text block with escaped line breaks", () => {
  const text = 'String a = """\n  one \\\n  two\\\n  """;\nString b = "x"\n  + "y";\n';
  assert.deepEqual(find(text), ['A.java:6 string literal continued with "+" across lines']);
});

// A hook exports GIT_DIR and friends; a fixture git call that inherits them
// acts on the real repository instead of the temp one.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

test("reads tracked backend Java only", () => {
  const root = mkdtempSync(resolve(tmpdir(), "text-block-check-"));
  const bad = 'class B { String s = "a"\n + "b"; }\n';
  try {
    execFileSync("git", ["init", "-q"], { cwd: root, env: cleanEnv });
    for (const file of ["backend/src/main/B.java", "backend/src/test/T.java", "web/C.java", "backend/D.java.txt"]) {
      mkdirSync(dirname(resolve(root, file)), { recursive: true });
      writeFileSync(resolve(root, file), bad);
    }
    mkdirSync(resolve(root, "backend/src/main"), { recursive: true });
    writeFileSync(resolve(root, "backend/src/main/Untracked.java"), bad);
    execFileSync(
      "git",
      ["add", "backend/src/main/B.java", "backend/src/test/T.java", "web/C.java", "backend/D.java.txt"],
      { cwd: root, env: cleanEnv },
    );
    assert.deepEqual(checkBackendJava(root), [
      'backend/src/main/B.java:2 string literal continued with "+" across lines',
      'backend/src/test/T.java:2 string literal continued with "+" across lines',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
