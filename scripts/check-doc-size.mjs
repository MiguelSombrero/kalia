#!/usr/bin/env node
// Fails when a capped document grows past its cap. docs/architecture.md shows
// the shape of the system and no more, and the root, backend, web and mobile
// READMEs are the ones every session reads first (ADR-0020); every task's
// doc-sync step had added what it built until they reached 1,667, 657 and 534
// lines. A line count is the one regrowth signal that needs no judgement.
// Plain Node, no dependencies.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const CAPS = {
  "docs/architecture.md": 500,
  "backend/README.md": 300,
  "web/README.md": 300,
  "mobile/README.md": 320,
  "README.md": 300,
};

const HINTS = {
  "docs/architecture.md":
    "It records shape only (ADR-0020): move behaviour to the README of the code it describes, and reasons to an ADR.",
  "backend/README.md":
    "It is loaded into every backend session: keep commands, conventions and traps, and leave reasons to an ADR and per-suite detail to the test's Javadoc.",
  "web/README.md":
    "It is loaded into every web session: keep commands, conventions and traps, and leave reasons to an ADR.",
  "mobile/README.md":
    "It is loaded into every mobile session: keep commands, conventions and traps, and leave reasons to an ADR and build detail to the scripts.",
  "README.md":
    "It is the front door and owns the stack's run instructions: keep commands, traps and what is said nowhere else, and leave reasons to an ADR and shape to docs/architecture.md.",
};

/**
 * @param {string} text the document's text
 * @returns {number} its line count, as `wc -l` counts it
 */
export function lineCount(text) {
  return text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let failed = false;
  for (const [file, cap] of Object.entries(CAPS)) {
    const lines = lineCount(readFileSync(resolve(root, file), "utf8"));
    console.log(`Checking that ${file} stays within ${cap} lines`);
    if (lines > cap) {
      console.log(`  FAIL  ${file}: ${lines} lines, ${lines - cap} over the cap. ${HINTS[file]}`);
      failed = true;
    } else {
      console.log(`  OK (${lines} lines)`);
    }
  }
  console.log("");
  if (failed) process.exit(1);
}
