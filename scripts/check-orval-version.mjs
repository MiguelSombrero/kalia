#!/usr/bin/env node
// Guards the drift COULD-1 found twice: README.md's tech-stack table,
// docs/adr/0012-orval-api-client.md and frontend/package.json each pin
// orval to a version, and nothing kept the three in sync — they had drifted
// to 8.24, 8.22.0 and ^8.24.0 respectively. README.md is the canonical
// pinned reference (CLAUDE.md's "New dependencies" rule), at major.minor
// precision (CLAUDE.md's tech-stack section states pins drift with every
// bump and points to the real files for exact patches) — so this compares
// major.minor across all three rather than exact patch versions. No
// dependencies — plain Node so this can run in CI without an npm install.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
const adr = readFileSync(resolve(ROOT, "docs/adr/0012-orval-api-client.md"), "utf8");
const pkg = readFileSync(resolve(ROOT, "frontend/package.json"), "utf8");

const readmeMatch = readme.match(/orval (\d+\.\d+) \(API client generated/);
const adrMatch = adr.match(/\*\*Tool: \[orval\]\(https:\/\/orval\.dev\) (\d+\.\d+)/);
const pkgMatch = pkg.match(/"orval":\s*"\^?(\d+\.\d+)/);

let failures = 0;
const fail = (msg) => { console.log(`  FAIL  ${msg}`); failures++; };

if (!readmeMatch) fail("could not find an 'orval X.Y (API client generated ...)' line in README.md's tech-stack table");
if (!adrMatch) fail("could not find a '**Tool: [orval](https://orval.dev) X.Y.**' line in docs/adr/0012-orval-api-client.md");
if (!pkgMatch) fail('could not find an "orval": "..." entry in frontend/package.json');

if (readmeMatch && adrMatch && pkgMatch) {
  const [readmeVersion, adrVersion, pkgVersion] = [readmeMatch[1], adrMatch[1], pkgMatch[1]];
  console.log(`README.md: orval ${readmeVersion}`);
  console.log(`docs/adr/0012-orval-api-client.md: orval ${adrVersion}`);
  console.log(`frontend/package.json: orval ${pkgVersion}`);
  if (adrVersion !== readmeVersion) {
    fail(`docs/adr/0012-orval-api-client.md pins orval ${adrVersion}, but README.md's tech-stack table (the pinned reference) says ${readmeVersion}`);
  }
  if (pkgVersion !== readmeVersion) {
    fail(`frontend/package.json pins orval ${pkgVersion}, but README.md's tech-stack table (the pinned reference) says ${readmeVersion}`);
  }
}

console.log(failures === 0 ? "\nOK\n" : `\n${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
