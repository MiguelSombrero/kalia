#!/usr/bin/env node
// Guards the drift ADR-0019 found by hand: the ADR index had silently stopped
// gaining rows, and status text had forked between a file and its index row.
// No dependencies — plain Node so this can run in CI without an npm install.
//
// Two tiers of check:
//   - Universal, on every ADR: a row exists in docs/adr/README.md's "All ADRs
//     by number" table (its title, status and date cells are
//     sync-indexes.mjs's, per ADR-0076), the ADR is also listed in the subject
//     sections above that table, Status is a vocabulary token, and whichever
//     of the five canonical headings are present appear in canonical order
//     with no unknown heading interspersed.
//   - Template-only, on ADRs that have adopted "## Alternatives considered"
//     (ADR-0019's template): Consequences must contain at least one
//     "Bad," or "Neutral," entry. Not applied to the 13 ADRs deliberately
//     left on the pre-template shape (ADR-0019's Alternatives considered
//     section explains why they weren't rewritten) — enforcing it there
//     would fail CI on history this project chose to keep, not on new
//     drift.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

const STATUS_TOKENS = ["proposed", "accepted", "superseded", "partially-superseded", "deprecated"];
const CANONICAL_ORDER = ["Context", "Decision", "Alternatives considered", "Consequences", "Evidence"];

// The table is scoped by its heading: the subject sections above it link the
// same files, and would otherwise count as an index row for the wrong reason.
const INDEX_HEADING = /^## All ADRs by number$/m;

/**
 * @param {string} root repository root to check
 * @returns {{ adrCount: number, failures: { file: string, msg: string }[] }}
 */
export function checkAdrs(root) {
  const failures = [];
  const fail = (file, msg) => failures.push({ file, msg });

  const adrDir = resolve(root, "docs/adr");
  const files = readdirSync(adrDir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort();

  const readmeText = readFileSync(resolve(adrDir, "README.md"), "utf8");
  const indexStart = readmeText.search(INDEX_HEADING);
  if (indexStart === -1) {
    fail("docs/adr/README.md", "no '## All ADRs by number' heading");
    return { adrCount: files.length, failures };
  }
  // Only coverage is checked in the subject sections, not titles: they carry a
  // gloss rather than a copy of the title, so there is nothing there to drift.
  const subjectText = readmeText.slice(0, indexStart);
  const indexText = readmeText.slice(indexStart);
  const indexRows = indexText.split("\n").filter((l) => l.startsWith("|"));

  for (const file of files) {
    const text = readFileSync(resolve(adrDir, file), "utf8");

    if (!/^# ADR-\d{4}: .+$/m.test(text)) { fail(file, "no H1 matching '# ADR-NNNN: Title'"); continue; }

    const status = text.match(/^- \*\*Status:\*\* (.+)$/m)?.[1];
    if (!status) fail(file, "no '- **Status:** ...' metadata line");
    else if (!STATUS_TOKENS.includes(status)) {
      fail(file, `Status "${status}" is not one of: ${STATUS_TOKENS.join(", ")}`);
    }

    if (!indexRows.some((l) => l.includes(`](${file})`))) {
      fail(file, `no row in docs/adr/README.md's "All ADRs by number" (looked for a link to ${file})`);
    }

    if (!subjectText.includes(`](${file})`)) {
      fail(file, `not listed in a subject section of docs/adr/README.md (looked for a link to ${file})`);
    }

    const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    const unknown = headings.filter((h) => !CANONICAL_ORDER.includes(h));
    if (unknown.length > 0) {
      fail(file, `heading(s) not in the template's vocabulary: ${unknown.join(", ")}`);
    }
    const known = headings.filter((h) => CANONICAL_ORDER.includes(h));
    const expectedOrder = CANONICAL_ORDER.filter((h) => known.includes(h));
    if (known.join("|") !== expectedOrder.join("|")) {
      fail(file, `headings out of canonical order: got [${known.join(", ")}], want [${expectedOrder.join(", ")}]`);
    }

    const isTemplateConforming = headings.includes("Alternatives considered");
    if (isTemplateConforming) {
      const consIdx = text.indexOf("## Consequences");
      const nextHeadingIdx = text.indexOf("\n## ", consIdx + 1);
      const consequences = text.slice(consIdx, nextHeadingIdx === -1 ? undefined : nextHeadingIdx);
      if (!/\b(Bad|Neutral),/.test(consequences)) {
        fail(file, "template-conforming ADR's Consequences has no 'Bad,' or 'Neutral,' entry");
      }
    }
  }

  // Every index row must correspond to a file — catches a row surviving a
  // rename or deletion.
  for (const [, rid] of indexText.matchAll(/\|\s*\[ADR-(\d{4})\]/g)) {
    if (!files.some((f) => f.startsWith(rid))) {
      fail("docs/adr/README.md", `index row for ADR-${rid} has no corresponding file in docs/adr/`);
    }
  }

  // Same for the subject sections, which link files rather than tabulating ids.
  for (const [, link] of subjectText.matchAll(/\]\((\d{4}-[^)]*\.md)\)/g)) {
    if (!files.includes(link)) {
      fail("docs/adr/README.md", `links ${link}, which does not exist in docs/adr/`);
    }
  }

  return { adrCount: files.length, failures };
}

const invokedDirectly =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (invokedDirectly) {
  const { adrCount, failures } = checkAdrs(resolve(SELF_DIR, ".."));
  console.log(`Checking ${adrCount} ADRs in docs/adr/ against docs/adr/README.md's index and subject sections\n`);
  for (const { file, msg } of failures) console.log(`  FAIL  ${file}: ${msg}`);
  console.log(failures.length === 0 ? "\nOK\n" : `\n${failures.length} failure(s)\n`);
  process.exit(failures.length === 0 ? 0 : 1);
}
