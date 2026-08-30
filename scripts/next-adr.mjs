#!/usr/bin/env node
// Allocates the next ADR number. Sibling of the check-*.mjs checkers, same
// no-dependency constraint. Exists because ADR-0034 was written twice under
// one number: two sessions each read the directory, each saw 0033 as the
// highest, and the collision only surfaced in review. Reading the directory
// is what both did — the fix is not a better read but one command whose
// output is the same for everyone, which is also what a hook or a headless
// run can call.

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ADR_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "docs/adr");

const used = readdirSync(ADR_DIR)
  .map((f) => /^(\d{4})-.*\.md$/.exec(f)?.[1])
  .filter(Boolean)
  .map(Number);

// max + 1 rather than the lowest free number: a gap means a withdrawn ADR,
// and reusing its number would silently repoint every link that still names
// it. ADR-0019 makes ids permanent for the same reason task ids are.
const next = (used.length === 0 ? 0 : Math.max(...used)) + 1;

console.log(String(next).padStart(4, "0"));
