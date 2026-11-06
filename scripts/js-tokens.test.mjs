#!/usr/bin/env node
// Self-test for js-tokens.mjs, which three checkers read the tree through: a
// misread here changes what all of them see while each one's own fixtures
// may still pass.

import test from "node:test";
import assert from "node:assert/strict";

import { depthChange, matching, tokenize } from "./js-tokens.mjs";

const kinds = (source) => tokenize(source).map((t) => `${t.type}:${t.value}`);

test("a slash after a value divides, and after an operator or keyword starts a regex", () => {
  assert.deepEqual(kinds("a / b / c"), ["ident:a", "punct:/", "ident:b", "punct:/", "ident:c"]);
  assert.deepEqual(kinds("f(x) / 2"), ["ident:f", "punct:(", "ident:x", "punct:)", "punct:/", "num:2"]);
  assert.deepEqual(kinds("x = /a\\/b[/]/g"), ["ident:x", "punct:=", "regex:a\\/b[/]"]);
  assert.deepEqual(kinds("return /c/.test(s)").slice(0, 2), ["ident:return", "regex:c"]);
  assert.equal(tokenize("x = /a/gi")[2].flags, "gi");
});

test("strings, comments and a hashbang hide what looks like code", () => {
  assert.deepEqual(kinds("#!/usr/bin/env node\n// import x from 'y'\n/* a / b */ 'it\\'s' \"q\""), ["str:it\\'s", 'str:q']);
});

test("a template splits into chunks around its substitutions, nested ones included", () => {
  const tokens = tokenize("`a${b + `c${d}e`}f`");
  assert.deepEqual(
    tokens.map((t) => (t.type === "tmpl" ? `tmpl:${t.value}:${t.opens ? "o" : ""}${t.closes ? "c" : ""}` : `${t.type}:${t.value}`)),
    ["tmpl:a:o", "ident:b", "punct:+", "tmpl:c:o", "ident:d", "tmpl:e:c", "tmpl:f:c"],
  );
  assert.equal(matching(tokens, 0), 6);
  assert.equal(tokens.reduce((depth, t) => depth + depthChange(t), 0), 0);
});

test("an object literal inside a substitution does not end it", () => {
  const tokens = tokenize("`${ {a: 1}.a }`");
  assert.deepEqual(tokens.filter((t) => t.type === "tmpl").map((t) => [t.opens, t.closes]), [[true, false], [false, true]]);
});

test("lines count newlines inside comments, templates and continued strings", () => {
  const tokens = tokenize("/*\n\n*/ a\n`x\ny` b\n'c\\\nd' e");
  assert.deepEqual(
    tokens.filter((t) => t.type === "ident").map((t) => [t.value, t.line]),
    [["a", 3], ["b", 5], ["e", 7]],
  );
});

test("matching finds the bracket that closes the one opened", () => {
  const tokens = tokenize("f(a, [b, {c}], (d))");
  assert.equal(tokens[matching(tokens, 1)].value, ")");
  assert.equal(matching(tokens, 1), tokens.length - 1);
});
