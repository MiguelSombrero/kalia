import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkContrast, contrastRatio } from "./check-contrast.mjs";
import { tokens } from "../packages/tokens/src/tokens.ts";

test("WCAG contrast ratio is calculated", () => assert.equal(contrastRatio("#000", "#fff"), 21));
test("dark-mode and beer-style failures are checked independently", () => {
  const root = mkdtempSync(resolve(tmpdir(), "contrast-token-"));
  try {
    mkdirSync(resolve(root, "docs"));
    writeFileSync(resolve(root, "docs/design.md"), "## Contrast pairings\n| `--color-foreground` | `--color-background` | text |\n");
    const source = structuredClone(tokens);
    assert.deepEqual(checkContrast(root, source).failures, []);
    source.colors.find((t) => t.name === "foreground").dark = "graphite-950";
    assert.ok(checkContrast(root, source).failures.some((failure) => failure.includes("(dark)")));
    source.variants[0].values[0].dark.foreground = "roast-950";
    assert.ok(checkContrast(root, source).failures.some((failure) => failure.includes("stout") && failure.includes("dark")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("a pairing marked light is held in light only, and an unknown mode is a failure", () => {
  const root = mkdtempSync(resolve(tmpdir(), "contrast-modes-"));
  try {
    mkdirSync(resolve(root, "docs"));
    const source = structuredClone(tokens);
    const write = (row) => writeFileSync(resolve(root, "docs/design.md"), `## Contrast pairings\n${row}\n`);

    write("| `--color-mark-tile` | `--color-background` | non-text |");
    source.colors.find((t) => t.name === "background").dark = "graphite-950";
    assert.ok(checkContrast(root, source).failures.some((failure) => failure.includes("mark-tile") && failure.includes("(dark)")));

    write("| `--color-mark-tile` | `--color-background` | non-text | light |");
    const light = checkContrast(root, source);
    assert.deepEqual(light.failures, []);
    assert.ok(light.results.every((result) => !result.label.includes("mark-tile") || result.label.includes("(light)")));

    write("| `--color-mark-tile` | `--color-background` | non-text | dark |");
    assert.ok(checkContrast(root, source).failures.some((failure) => failure.includes('modes "dark"')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("all real pairings and variants pass both modes", () => assert.deepEqual(checkContrast(resolve(import.meta.dirname, "..")).failures, []));
