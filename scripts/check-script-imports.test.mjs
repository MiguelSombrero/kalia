#!/usr/bin/env node
// Fixture self-test for check-script-imports.mjs. The real tests import no
// package, so the check never fires on them and would stay green if it
// stopped looking.

import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { importsOf, isBuiltin, problemsFrom } from "./check-script-imports.mjs";

const ROOT = resolve("/repo");

const tree = (files) => (path) => {
  const name = path.slice(ROOT.length + 1);
  if (!(name in files)) throw new Error(`no fixture for ${name}`);
  return files[name];
};

test("reads static, side-effect, re-export, dynamic and require imports with their lines", () => {
  const source = [
    'import test from "node:test";',
    'import "./setup.mjs";',
    "import {",
    "  a,",
    '} from "./multi.mjs";',
    'export { b } from "./again.mjs";',
    'export * from "./all.mjs";',
    'const late = await import("./late.mjs");',
    'const old = require("./old.cjs");',
  ].join("\n");
  assert.deepEqual(importsOf(source), [
    { specifier: "node:test", line: 1 },
    { specifier: "./setup.mjs", line: 2 },
    { specifier: "./multi.mjs", line: 5 },
    { specifier: "./again.mjs", line: 6 },
    { specifier: "./all.mjs", line: 7 },
    { specifier: "./late.mjs", line: 8 },
    { specifier: "./old.cjs", line: 9 },
  ]);
});

test("an import inside a string, a template or a comment is not an import", () => {
  const source = [
    "// import sharp from \"sharp\";",
    "const fixture = 'import sharp from \"sharp\";';",
    "const other = `import(\"sharp\")`;",
    "if (import.meta.main) run();",
  ].join("\n");
  assert.deepEqual(importsOf(source), []);
});

test("node: and bare built-in names are built-ins; a package is not", () => {
  assert.ok(isBuiltin("node:fs"));
  assert.ok(isBuiltin("fs/promises"));
  assert.ok(!isBuiltin("sharp"));
  assert.ok(!isBuiltin("@kalia/api"));
});

test("passes a test that imports only Node built-ins and repository files", () => {
  const read = tree({
    "scripts/a.test.mjs": 'import test from "node:test";\nimport { a } from "./a.mjs";\nimport data from "./data.json" with { type: "json" };',
    "scripts/a.mjs": 'import { readFileSync } from "fs";\nexport const a = 1;',
  });
  assert.deepEqual(problemsFrom(ROOT, ["scripts/a.test.mjs"], read), []);
});

test("fails a test that imports an npm package, naming the line", () => {
  const read = tree({ "scripts/icons.test.mjs": 'import test from "node:test";\nimport sharp from "sharp";' });
  assert.deepEqual(problemsFrom(ROOT, ["scripts/icons.test.mjs"], read), [
    'scripts/icons.test.mjs:2 imports "sharp", which is neither a Node built-in nor a repository file',
  ]);
});

test("fails a package imported by a script the test loads, naming that script and the test", () => {
  const read = tree({
    "scripts/icons.test.mjs": 'import { render } from "./icons.mjs";',
    "scripts/icons.mjs": 'import { join } from "node:path";\n\nimport sharp from "sharp";',
  });
  assert.deepEqual(problemsFrom(ROOT, ["scripts/icons.test.mjs"], read), [
    'scripts/icons.mjs:3 imports "sharp", which is neither a Node built-in nor a repository file (loaded by scripts/icons.test.mjs)',
  ]);
});

test("fails a workspace package and a file outside the repository", () => {
  const read = tree({ "scripts/x.test.mjs": 'import { client } from "@kalia/api";\nimport y from "../../elsewhere.mjs";' });
  const problems = problemsFrom(ROOT, ["scripts/x.test.mjs"], read);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /:1 imports "@kalia\/api"/);
  assert.match(problems[1], /:2 imports "\.\.\/\.\.\/elsewhere\.mjs", which is outside the repository/);
});
