#!/usr/bin/env node
// Guards the drift iteration 6 task 08 was written about: a backend `domain`
// type is added and no document says what it means, so the ubiquitous
// language lives only in the code — which this project cannot rely on,
// because the agent that wrote it keeps no memory between sessions. Sibling
// of check-adrs.mjs / check-tasks.mjs / check-comments.mjs: plain Node, no
// dependencies, so it runs in CI without an npm install.
//
// Unlike those three it ships a fixture-driven self-test
// (check-glossary.test.mjs), because nothing in the real tree would ever
// trip this check on its own — a check that never fires passes whether or
// not its condition is right, which is why ArchitectureRulesRejectViolationsTest
// exists on the backend side.
//
// What it checks, bidirectionally, per backend module that has a `domain`
// package:
//   - every `*.java` in `fi.kalia.<module>.domain` (bar package-info) has a
//     row in that module's `### Domain types (`fi.kalia.<module>.domain`)`
//     table in docs/glossary.md — a type with no row is the failure this is
//     meant to make visible;
//   - every row in that table names a type that still exists — so a rename
//     or deletion cannot leave a stale entry.
// The rest of the glossary — cross-module collisions, published REST/JSON/
// TypeScript vocabulary, dropped terms, term rules — is a review call, the
// same advisory tier check-comments.mjs draws.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} root repository root to check
 * @returns {string[]} one message per failure; empty means OK
 */
export function checkGlossary(root) {
  const failures = [];
  const glossaryPath = resolve(root, "docs/glossary.md");
  const javaRoot = resolve(root, "backend/src/main/java/fi/kalia");

  let glossary;
  try {
    glossary = readFileSync(glossaryPath, "utf8");
  } catch {
    return [`docs/glossary.md not found at ${glossaryPath}`];
  }

  const modules = readdirSync(javaRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => {
      try {
        return readdirSync(resolve(javaRoot, name)).includes("domain");
      } catch {
        return false;
      }
    })
    .sort();

  for (const module of modules) {
    const domainDir = resolve(javaRoot, module, "domain");
    const actualTypes = readdirSync(domainDir)
      .filter((f) => f.endsWith(".java") && f !== "package-info.java")
      .map((f) => f.slice(0, -".java".length))
      .sort();

    const declaredTypes = domainTypeRows(glossary, module);
    if (declaredTypes === null) {
      failures.push(
        `docs/glossary.md: no "### Domain types (\`fi.kalia.${module}.domain\`)" table — ` +
          `module \`${module}\` has ${actualTypes.length} domain type(s) to document`,
      );
      continue;
    }

    for (const type of actualTypes) {
      if (!declaredTypes.includes(type)) {
        failures.push(
          `docs/glossary.md: \`fi.kalia.${module}.domain.${type}\` has no glossary entry ` +
            `(add a \`${type}\` row to the ${module} "Domain types" table)`,
        );
      }
    }
    for (const type of declaredTypes) {
      if (!actualTypes.includes(type)) {
        failures.push(
          `docs/glossary.md: the ${module} "Domain types" table lists \`${type}\`, ` +
            `which is not a type in fi.kalia.${module}.domain`,
        );
      }
    }
  }

  return failures;
}

// The first-column code-span tokens of the `### Domain types (`fi.kalia.<module>.domain`)`
// table, from its heading to the next heading of the same or higher level.
// Returns null when the table's heading is absent.
function domainTypeRows(glossary, module) {
  const lines = glossary.split("\n");
  const headingRe = new RegExp(
    "^###\\s+Domain types\\s+\\(`fi\\.kalia\\." + module + "\\.domain`\\)\\s*$",
  );
  const start = lines.findIndex((l) => headingRe.test(l));
  if (start === -1) return null;

  const types = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) break;
    const cell = line.match(/^\|\s*`([A-Za-z][A-Za-z0-9_]*)`\s*\|/);
    if (cell) types.push(cell[1]);
  }
  return types.sort();
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(SELF_DIR, "..");
  const failures = checkGlossary(root);
  console.log(`Checking docs/glossary.md against backend domain packages\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
