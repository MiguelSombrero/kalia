#!/usr/bin/env node
// Fixture self-test for check-markup-stripping.mjs. The tree strips no markup
// with a regex, so the check never fires there and would stay green if it
// stopped looking.

import test from "node:test";
import assert from "node:assert/strict";

import { markupStrippings, stripsMarkup } from "./check-markup-stripping.mjs";

test("fails a regex that strips comments, declarations or processing instructions from markup", () => {
  const source = 'const x = 1;\nconst stripped = xml.replace(/<\\?[\\s\\S]*?\\?>|<!--[\\s\\S]*?-->|<!DOCTYPE[^>]*>/g, "");';
  assert.deepEqual(markupStrippings(source), [2]);
});

test("fails a regex that strips tags, with replace or replaceAll", () => {
  assert.deepEqual(markupStrippings('html.replace(/<[^>]*>/g, "");'), [1]);
  assert.deepEqual(markupStrippings('html.replaceAll(/<\\/?[a-z]+>/gi, " ");'), [1]);
  assert.deepEqual(markupStrippings('html?.replace(/<script.*?>/g, "");'), [1]);
});

test("fails a regex held in a constant and passed by name, reporting the call", () => {
  const source = 'const COMMENT = /<!--[\\s\\S]*?-->/g;\nconst OTHER = /x/g;\nconst lines = body.replace(COMMENT, "").replace(OTHER, "").split("\\n");';
  assert.deepEqual(markupStrippings(source), [3]);
});

test("passes the corrected form, which matches the markup as tokens", () => {
  const source = 'const tokens = [...xml.matchAll(/<!--[\\s\\S]*?-->|<(\\/?)([A-Za-z]+)\\s*(\\/?)>|([^<]+)/g)];';
  assert.deepEqual(markupStrippings(source), []);
});

test("passes a pattern that removes one match: without the g flag, or anchored", () => {
  assert.deepEqual(markupStrippings('const TILE = /<rect [^>]*\\/>/;\nsvg.replace(TILE, "").replace(/<!--.*?-->/, "");'), []);
  assert.deepEqual(markupStrippings('svg.replace(/^\\s*<svg[^>]*>/g, "").replace(/<\\/svg>\\s*$/g, "");'), []);
  assert.ok(stripsMarkup("^<!--|-->"), "an alternation escapes the anchor");
});

test("passes a CSS comment, a lookbehind, an escaped angle bracket and a lone <", () => {
  assert.deepEqual(markupStrippings('css.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "");'), []);
  assert.deepEqual(markupStrippings('s.replace(/(?<=a)b/g, "").replace(/(?<!x)y/g, "").replace(/(?<name>z)/g, "");'), []);
  assert.deepEqual(markupStrippings('target.replace(/^<|>$/g, "");'), []);
});

test("a regex in a string or a comment is not code", () => {
  assert.deepEqual(markupStrippings('// html.replace(/<[^>]*>/g, "")\nconst s = \'html.replace(/<[^>]*>/g, "")\';'), []);
});
