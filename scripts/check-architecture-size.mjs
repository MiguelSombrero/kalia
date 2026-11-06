#!/usr/bin/env node
// Fails when docs/architecture.md grows past its cap. The document shows the
// shape of the system and no more (ADR-0020); every task's doc-sync step had
// added what it built until it reached 1,667 lines. A line count is the one
// regrowth signal that needs no judgement. Plain Node, no dependencies.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export const MAX_LINES = 500;

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
  const lines = lineCount(readFileSync(resolve(root, "docs/architecture.md"), "utf8"));
  console.log(`Checking that docs/architecture.md stays within ${MAX_LINES} lines\n`);
  if (lines > MAX_LINES) {
    console.log(
      `  FAIL  docs/architecture.md: ${lines} lines, ${lines - MAX_LINES} over the cap. It records shape only ` +
        "(ADR-0020): move behaviour to the README of the code it describes, and reasons to an ADR.\n",
    );
    process.exit(1);
  }
  console.log(`OK (${lines} lines)\n`);
}
