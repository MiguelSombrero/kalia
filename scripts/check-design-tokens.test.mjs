import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkDesignTokens } from "./check-design-tokens.mjs";
import { tokens } from "../packages/tokens/src/tokens.ts";

const source = { colors: [{ name: "primary" }], fonts: [], typography: [], weights: [], spacing: [], radius: [], duration: [], easing: [] };
const run = (design, fixture = source) => {
  const root = mkdtempSync(resolve(tmpdir(), "design-meaning-"));
  try {
    mkdirSync(resolve(root, "docs"));
    mkdirSync(resolve(root, "web/app"), { recursive: true });
    writeFileSync(resolve(root, "web/app/globals.css"), "@theme inline { --animate-feed: x; }\n");
    writeFileSync(resolve(root, "docs/design.md"), design);
    return checkDesignTokens(root, fixture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
const design = "## Semantic tokens\n| `--color-primary` | Primary |\n| `--animate-feed` | Animation |\n";

test("each source token and animation has one meaning row", () => assert.deepEqual(run(design), []));
test("fails in both directions and on duplicates", () => {
  assert.match(run(design.replace("| `--color-primary` | Primary |\n", ""))[0], /primary.*no meaning row/);
  assert.match(run(`${design}| \`--color-extra\` | Extra |\n`)[0], /extra.*does not declare/);
  assert.match(run(`${design}| \`--color-primary\` | Again |\n`)[0], /primary.*2 meaning rows/);
});
test("a new source token requires a row", () => {
  assert.match(run(design, { ...source, colors: [...source.colors, { name: "added" }] })[0], /added.*no meaning row/);
});
test("real design documents all token meanings", () => assert.deepEqual(checkDesignTokens(resolve(import.meta.dirname, ".."), tokens), []));
