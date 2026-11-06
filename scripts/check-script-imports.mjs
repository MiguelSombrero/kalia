#!/usr/bin/env node
// Fails when a root script test (scripts/*.test.mjs), or a script it loads,
// imports anything but a Node built-in or a repository file. CI's Static
// checks job runs those tests through `make check` without `npm ci`, by
// design, so an npm import that passes locally fails there (ADR-0046). The
// failure names the file and line of the import, and the test that loads it.

import { builtinModules } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { tokenize } from "./js-tokens.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = /\.(mjs|cjs|js)$/;

/**
 * @param {string} source JavaScript source
 * @returns {{ specifier: string, line: number }[]} every static, re-export, dynamic and require import with a literal specifier
 */
export function importsOf(source) {
  const tokens = tokenize(source);
  const found = [];
  const word = (k, value) => tokens[k]?.type === "ident" && tokens[k].value === value;
  const punct = (k, value) => tokens[k]?.type === "punct" && tokens[k].value === value;
  const fromClause = (k) => {
    for (let j = k + 1; j < tokens.length && !punct(j, ";"); j++) {
      if (word(j, "from") && tokens[j + 1]?.type === "str") return tokens[j + 1];
      if (word(j, "import") || word(j, "export")) return null;
    }
    return null;
  };
  tokens.forEach((t, k) => {
    if (t.type !== "ident" || punct(k - 1, ".") || punct(k - 1, "?.")) return;
    if ((t.value === "import" || t.value === "require") && punct(k + 1, "(") && tokens[k + 2]?.type === "str") {
      found.push({ specifier: tokens[k + 2].value, line: tokens[k + 2].line });
    } else if (t.value === "import" && tokens[k + 1]?.type === "str") {
      found.push({ specifier: tokens[k + 1].value, line: tokens[k + 1].line });
    } else if ((t.value === "import" && !punct(k + 1, "(") && !punct(k + 1, ".")) || (t.value === "export" && (punct(k + 1, "{") || punct(k + 1, "*")))) {
      const from = fromClause(k);
      if (from) found.push({ specifier: from.value, line: from.line });
    }
  });
  return found;
}

/** @param {string} specifier */
export const isBuiltin = (specifier) => specifier.startsWith("node:") || builtinModules.includes(specifier);

/** @param {string} specifier */
const isRelative = (specifier) => specifier.startsWith("./") || specifier.startsWith("../");

/**
 * @param {string} root repository root
 * @param {string[]} tests repository-relative paths of the tests to start from
 * @param {(path: string) => string} read reads a file by absolute path
 * @returns {string[]} one message per import CI's Static checks job could not resolve; empty means OK
 */
export function problemsFrom(root, tests, read = (path) => readFileSync(path, "utf8")) {
  const problems = [];
  const seen = new Set();
  const visit = (file, test) => {
    if (seen.has(file)) return;
    seen.add(file);
    let source;
    try {
      source = read(file);
    } catch {
      return;
    }
    const name = relative(root, file).split(sep).join("/");
    const loadedBy = name === test ? "" : ` (loaded by ${test})`;
    for (const { specifier, line } of importsOf(source)) {
      if (isBuiltin(specifier)) continue;
      if (!isRelative(specifier)) {
        problems.push(`${name}:${line} imports "${specifier}", which is neither a Node built-in nor a repository file${loadedBy}`);
        continue;
      }
      const target = resolve(dirname(file), specifier);
      if (relative(root, target).startsWith("..")) {
        problems.push(`${name}:${line} imports "${specifier}", which is outside the repository${loadedBy}`);
      } else if (SCRIPT.test(target)) {
        visit(target, test);
      }
    }
  };
  for (const test of tests) visit(resolve(root, test), test);
  return problems;
}

const main = () => {
  const tests = readdirSync(resolve(ROOT, "scripts"))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => `scripts/${name}`);
  const problems = problemsFrom(ROOT, tests);
  console.log(`Checking that the ${tests.length} root script tests load only Node built-ins and repository files\n`);
  for (const problem of problems) console.log(`  FAIL  ${problem}`);
  if (problems.length > 0) {
    console.log(
      "\nCI's Static checks job runs these tests without node_modules. Move a script that needs a package into the workspace that declares it.",
    );
  }
  console.log(problems.length === 0 ? "\nOK\n" : `\n${problems.length} failure(s)\n`);
  process.exit(problems.length === 0 ? 0 : 1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
