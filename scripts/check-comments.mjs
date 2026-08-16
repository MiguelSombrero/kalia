#!/usr/bin/env node
// Guards the drift ADR-0017 named but left unguarded: "Nothing checks a
// comment against the ADR it paraphrases." Sibling of check-adrs.mjs and
// check-tasks.mjs, same shape and no-dependency constraint so it runs in CI
// without an npm install. Measured 2026-08-15 (iteration 5 task 18): the
// hand-written comment ratio had returned to at or above ADR-0017's
// pre-sweep 0.13, seven files carried more comment lines than code, 92
// comments named an ADR with nothing keeping the two in lockstep, and
// process narration CLAUDE.md already banned was live in the tree.
//
// Two tiers, matching the product-owner decision that only process
// narration is unambiguous enough to fail a build on (task 18 Constraints):
//   - Hard: a comment line matching one of the narration patterns below
//     fails the build. Each traces to a real instance found in the sweep —
//     `task N`/`iteration N` (CellarService.java named "iteration 8"),
//     `PR #N`/`pull request`, `used to be`/`formerly`/`renamed from`
//     (e2e/sign-in-out.spec.ts narrated a fixed defect as "previously").
//     Deliberately excludes `previously` and `no longer`: both have
//     legitimate uses describing external state rather than change history
//     (lib/auth/valkeyAdapter.ts's "no longer exists" is about a Keycloak
//     session, not a rewritten Kalia one) and would false-positive on that
//     class of comment.
//   - Advisory, always exits zero: a comment block naming an ADR that runs
//     more than one line (ADR-0017 allows a one-line pointer only), any file
//     whose comment lines outnumber its code lines, and the repository-wide
//     ratio. No ratio threshold hard-fails — signInContext.ts's 21-line
//     comment against 12 lines of code is exactly what ADR-0017 protects
//     (external Auth.js behaviour plus a "do not" warning for a failure
//     that is otherwise silent), and failing the build on it would push
//     agents toward deleting a load-bearing warning to get green.
//
// Counting method (pinned so the ratio is reproducible — ADR-0017's own
// 0.09 could not be recomputed from its text, and two independent passes
// over the same tree returned 0.13 and 0.18 depending on whether blank
// lines counted as code):
//   - Scope is every hand-written `.java` under backend/src and every
//     `.ts`/`.tsx` under frontend/, except frontend/lib/api/generated
//     (orval output, out of ADR-0017's Decision by name) and build/tooling
//     directories (node_modules, .next, target, coverage, dist, build,
//     playwright-report, test-results).
//   - A line's classification comes only from how it *starts*, once
//     trimmed: `//` or `/*` makes the whole line a comment line (a `/*...*/`
//     opener stays "comment" on every line up to and including the one
//     that closes it with `*/`); anything else is code. Two shapes this
//     misreads as a result — code with a trailing `//` note (misread as
//     code, correctly) is fine, but code sharing a line with a `/* */`
//     pragma (`/* eslint-disable */ import x;`) is misread as a pure
//     comment line. Neither shape occurs in this tree today (checked by
//     hand), so this is a known simplification, not a silent one. A blank
//     line (after trimming) is neither code nor comment, which is what
//     makes the ratio reproducible independent of blank-line style.
//   - A comment block is a maximal run of consecutive comment line numbers,
//     regardless of `//`- or `/*`-style; it ends at the first blank or code
//     line.
//   - Ratio = comment lines / code lines, matching how ADR-0017's own
//     0.13 -> 0.09 was expressed.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, resolve, relative } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = [
  { dir: resolve(ROOT, "backend/src"), extensions: [".java"] },
  { dir: resolve(ROOT, "frontend"), extensions: [".ts", ".tsx"] },
];
const IGNORED_DIRS = new Set([
  "node_modules", ".next", "target", "coverage", "dist", "build",
  "playwright-report", "test-results",
]);
// Exact path, not a name match against every "generated" directory anywhere
// — a future hand-written directory that happens to share the name must
// still be scanned.
const GENERATED_API_CLIENT = resolve(ROOT, "frontend/lib/api/generated");

// Each traces to an instance found in the 2026-08-15 sweep (see header).
// Deliberately excludes `previously` and `no longer` — see header.
const HARD_PATTERNS = [
  { name: "task N", re: /\btask\s+\d+\b/i },
  { name: "iteration N", re: /\biteration\s+\d+\b/i },
  { name: "PR #N", re: /\bPR\s*#\d+\b/i },
  { name: "pull request", re: /\bpull request\b/i },
  { name: "used to be", re: /\bused to be\b/i },
  { name: "formerly", re: /\bformerly\b/i },
  { name: "renamed from", re: /\brenamed from\b/i },
];
const ADR_MENTION = /\bADR-\d{4}\b/;

let failures = 0;
const fail = (file, line, msg) => { console.log(`  FAIL  ${file}:${line}: ${msg}`); failures++; };

const advisories = [];
const advise = (msg) => { advisories.push(msg); };

/** Recursively lists files under `dir` whose extension is in `extensions`. */
function listFiles(dir, extensions) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || full === GENERATED_API_CLIENT) continue;
      out.push(...listFiles(full, extensions));
    } else if (extensions.includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Classifies each line of `text` per the counting method pinned above. */
function classify(text) {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const codeLines = [];
  const commentLines = [];
  let inBlock = false;
  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const trimmed = raw.trim();
    if (trimmed === "") return;
    if (inBlock) {
      commentLines.push(lineNo);
      if (trimmed.includes("*/")) inBlock = false;
      return;
    }
    if (trimmed.startsWith("/*")) {
      commentLines.push(lineNo);
      inBlock = !trimmed.includes("*/");
      return;
    }
    if (trimmed.startsWith("//")) {
      commentLines.push(lineNo);
      return;
    }
    codeLines.push(lineNo);
  });
  return { lines, codeLines, commentLines };
}

/** Groups a sorted list of line numbers into maximal consecutive runs. */
function toBlocks(lineNumbers) {
  const blocks = [];
  for (const n of lineNumbers) {
    const last = blocks.at(-1);
    if (last && last.at(-1) === n - 1) last.push(n);
    else blocks.push([n]);
  }
  return blocks;
}

const files = SCAN_ROOTS.flatMap(({ dir, extensions }) => listFiles(dir, extensions));
console.log(`Checking ${files.length} hand-written source file(s) against the code-comment policy (ADR-0017)\n`);

/** `n / d` as a fixed-point string, or "n/a" rather than Infinity/NaN when `d` is 0. */
const formatRatio = (n, d) => (d === 0 ? "n/a" : (n / d).toFixed(2));

let totalCode = 0;
let totalComment = 0;

for (const path of files) {
  const rel = relative(ROOT, path);
  const fileText = readFileSync(path, "utf8");
  const { lines, codeLines, commentLines } = classify(fileText);

  for (const lineNo of commentLines) {
    const lineText = lines[lineNo - 1];
    for (const { name, re } of HARD_PATTERNS) {
      if (re.test(lineText)) fail(rel, lineNo, `comment reads as process narration (matches "${name}")`);
    }
  }

  for (const block of toBlocks(commentLines)) {
    if (block.length <= 1) continue;
    const blockText = block.map((n) => lines[n - 1]).join("\n");
    if (ADR_MENTION.test(blockText)) {
      advise(`${rel}:${block[0]}-${block.at(-1)}: ${block.length}-line comment block names an ADR (ADR-0017 allows a one-line pointer)`);
    }
  }

  totalCode += codeLines.length;
  totalComment += commentLines.length;
  if (commentLines.length > codeLines.length) {
    advise(`${rel}: ${commentLines.length} comment line(s) outnumber ${codeLines.length} code line(s) (ratio ${formatRatio(commentLines.length, codeLines.length)})`);
  }
}

advise(`repository-wide hand-written ratio: ${formatRatio(totalComment, totalCode)} (${totalComment} comment / ${totalCode} code lines; ADR-0017's post-sweep baseline was 0.09)`);

console.log("Advisory (never fails the build):");
for (const msg of advisories) console.log(`  ADVISE ${msg}`);

console.log(failures === 0 ? "\nOK\n" : `\n${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
