#!/usr/bin/env node
// Guards the drift ADR-0019 found by hand: the index in docs/architecture.md
// had silently stopped gaining rows, and status text had forked between a
// file and its index row. No dependencies — plain Node so this can run in CI
// without an npm install.
//
// Two tiers of check:
//   - Universal, on every ADR: a row exists in docs/architecture.md's ADR
//     index with matching title and status, the ADR is also listed in the
//     grouped index
//     docs/adr/README.md, Status is a vocabulary token, and whichever of the
//     five canonical headings are present appear in canonical order with no
//     unknown heading interspersed.
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADR_DIR = resolve(ROOT, "docs/adr");
const ARCH = resolve(ROOT, "docs/architecture.md");
const ADR_README = resolve(ADR_DIR, "README.md");

const STATUS_TOKENS = ["proposed", "accepted", "superseded", "partially-superseded", "deprecated"];
const CANONICAL_ORDER = ["Context", "Decision", "Alternatives considered", "Consequences", "Evidence"];

let failures = 0;
const fail = (file, msg) => { console.log(`  FAIL  ${file}: ${msg}`); failures++; };

const files = readdirSync(ADR_DIR)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .sort();
const archText = readFileSync(ARCH, "utf8");
// Scoped to the ADR-index section only: architecture.md also links ADR files
// from other sections (e.g. the §7 testing-strategy table), which would
// otherwise false-match as an index row for the wrong reason. Matched without
// its section number, which has changed once already.
const INDEX_HEADING = /^## \d+\. Architecture decision records$/m;
const indexStart = archText.search(INDEX_HEADING);
if (indexStart === -1) {
  console.log("FAIL: could not find the 'N. Architecture decision records' heading in " + ARCH);
  process.exit(1);
}
const archLines = archText.slice(indexStart).split("\n");

// The second index (ADR-0031): docs/adr/README.md groups the same ADRs by
// subject. Only coverage is checked, not titles — README.md carries a gloss
// rather than a copy of the title, so there is nothing there to drift.
const readmeText = readFileSync(ADR_README, "utf8");

console.log(
  `Checking ${files.length} ADRs in docs/adr/ against docs/architecture.md's index and docs/adr/README.md\n`,
);

for (const file of files) {
  const text = readFileSync(resolve(ADR_DIR, file), "utf8");

  const h1 = text.match(/^# ADR-(\d{4}): (.+)$/m);
  if (!h1) { fail(file, "no H1 matching '# ADR-NNNN: Title'"); continue; }
  const [, id, title] = h1;

  const status = text.match(/^- \*\*Status:\*\* (.+)$/m)?.[1];
  if (!status) fail(file, "no '- **Status:** ...' metadata line");
  else if (!STATUS_TOKENS.includes(status)) {
    fail(file, `Status "${status}" is not one of: ${STATUS_TOKENS.join(", ")}`);
  }

  const row = archLines.find((l) => l.startsWith("|") && l.includes(`adr/${file})`));
  if (!row) {
    fail(file, `no row in docs/architecture.md's ADR index (looked for a link to adr/${file})`);
  } else {
    const cells = row.split("|").map((c) => c.trim());
    // | [ADR-nnnn](adr/file.md) | Title | Status | Date |
    const rowTitle = cells[2];
    const rowStatus = cells[3];
    if (rowTitle !== title) {
      fail(file, `index title "${rowTitle}" does not match H1 "${title}"`);
    }
    if (status && rowStatus !== status) {
      fail(file, `index status "${rowStatus}" does not match file status "${status}"`);
    }
  }

  if (!readmeText.includes(`](${file})`)) {
    fail(file, `not listed in docs/adr/README.md (looked for a link to ${file})`);
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
const rowIds = [...archText.matchAll(/\|\s*\[ADR-(\d{4})\]/g)].map((m) => m[1]);
for (const rid of rowIds) {
  if (!files.some((f) => f.startsWith(rid))) {
    fail(`docs/architecture.md`, `index row for ADR-${rid} has no corresponding file in docs/adr/`);
  }
}

// Same for the grouped index, which links files rather than tabulating ids.
const readmeLinks = new Set(
  [...readmeText.matchAll(/\]\((\d{4}-[^)]*\.md)\)/g)].map((m) => m[1]),
);
for (const link of readmeLinks) {
  if (!files.includes(link)) {
    fail("docs/adr/README.md", `links ${link}, which does not exist in docs/adr/`);
  }
}

console.log(failures === 0 ? "\nOK\n" : `\n${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
