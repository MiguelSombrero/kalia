#!/usr/bin/env node
// Fails when a repository script strips markup or a markup comment with a
// regex: `.replace(/<!--[\s\S]*?-->/g, "")` and its kind. Removing one match
// can join the text around it into a new one, which is what CodeQL's
// js/incomplete-multi-character-sanitization reports in CI and `make
// verify-fast` cannot run (ADR-0046). Match the markup as tokens instead.
//
// A pattern anchored to the start or end of the text is let through, since it
// removes one match in a fixed place; so is a CSS `/* */` comment, which
// CodeQL does not count as markup.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { tokenize } from "./js-tokens.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// `<` opening a tag, a closing tag, a comment, a declaration or a processing
// instruction, but not the `(?<=`, `(?<!` or `(?<name>` of a group.
const MARKUP = /(?<!\(\?)<(?:!|\\?\?|\\?\/|[A-Za-z]|\[|\\w|\.|\()/;
const ANCHORED = /^\^|(?<!\\)\$$/;

/** @param {string} pattern a regex literal's source */
export const stripsMarkup = (pattern) => MARKUP.test(pattern) && !(ANCHORED.test(pattern) && !topLevelAlternation(pattern));

const topLevelAlternation = (pattern) => {
  let depth = 0;
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") i++;
    else if (inClass) inClass = c !== "]";
    else if (c === "[") inClass = true;
    else if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "|" && depth === 0) return true;
  }
  return false;
};

/**
 * @param {string} source JavaScript source
 * @returns {number[]} the line of each `.replace`/`.replaceAll` whose regex strips markup
 */
export function markupStrippings(source) {
  const tokens = tokenize(source);
  const lines = [];
  tokens.forEach((t, k) => {
    const call = t.type === "ident" && ["replace", "replaceAll"].includes(t.value) && ["." , "?."].includes(tokens[k - 1]?.value);
    if (call && tokens[k + 1]?.value === "(" && tokens[k + 2]?.type === "regex" && stripsMarkup(tokens[k + 2].value)) lines.push(tokens[k + 2].line);
  });
  return lines;
}

const main = () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.mjs", "*.cjs", "*.js"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const problems = files.flatMap((file) =>
    markupStrippings(readFileSync(resolve(ROOT, file), "utf8")).map((line) => `${file}:${line} strips markup with a regex`),
  );
  console.log(`Checking that ${files.length} scripts strip no markup with a regex\n`);
  for (const problem of problems) console.log(`  FAIL  ${problem}`);
  if (problems.length > 0) {
    console.log("\nMatch the markup as tokens instead (CodeQL's js/incomplete-multi-character-sanitization fails the same line in CI).");
  }
  console.log(problems.length === 0 ? "\nOK\n" : `\n${problems.length} failure(s)\n`);
  process.exit(problems.length === 0 ? 0 : 1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
