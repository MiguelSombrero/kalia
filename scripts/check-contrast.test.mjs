#!/usr/bin/env node
// Fixture self-test for check-contrast.mjs: the real palette passes once it
// is committed, so without fixtures a checker that stopped failing would stay
// green.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkContrast, contrastRatio } from "./check-contrast.mjs";

const globalsCss = [
  '@import "tailwindcss";',
  "",
  ":root {",
  "  --ink: #121212;",
  "  --white: #fff;",
  "  --grey: #777777;",
  "  --pale: #e2e0d8;",
  "  --dark: #141210;",
  "  --background: var(--white);",
  "  --foreground: var(--ink);",
  "  --edge: var(--grey);",
  "  /* a comment holding --foreground: #ffffff must not count */",
  "  --style: var(--pale);",
  "  --style-foreground: var(--ink);",
  "}",
  "",
  '[data-beer-style="stout"] {',
  "  --style: var(--dark);",
  "  --style-foreground: var(--white);",
  "}",
  "",
  "@theme inline {",
  "  --color-background: var(--background);",
  "  --color-foreground: var(--foreground);",
  "  --color-edge: var(--edge);",
  "  --color-style: var(--style);",
  "  --color-style-foreground: var(--style-foreground);",
  "}",
  "",
].join("\n");

const designMd = [
  "# Design fixture",
  "",
  "## Contrast pairings",
  "",
  "| Foreground | Background | Kind |",
  "|---|---|---|",
  "| `--color-foreground` | `--color-background` | text |",
  "| `--color-edge` | `--color-background` | non-text |",
  "| `--color-style-foreground` | `--color-style` | text |",
  "",
  "## Something else",
  "",
  "| `--color-edge` | `--color-foreground` | text |",
  "",
].join("\n");

function withFixture({ css = globalsCss, design = designMd } = {}, assertions) {
  const root = mkdtempSync(resolve(tmpdir(), "contrast-check-"));
  try {
    mkdirSync(resolve(root, "frontend/app"), { recursive: true });
    mkdirSync(resolve(root, "docs"), { recursive: true });
    if (css !== null) writeFileSync(resolve(root, "frontend/app/globals.css"), css);
    if (design !== null) writeFileSync(resolve(root, "docs/design.md"), design);
    assertions(checkContrast(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("computes WCAG 2.1 relative-luminance contrast", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#fff", "#000"), 21);
  assert.equal(contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
});

test("passes when every declared pairing and every style block meets AA", () => {
  withFixture({}, ({ failures, results }) => {
    assert.deepEqual(failures, []);
    assert.equal(results.length, 4);
  });
});

test("fails a text pairing below 4.5:1", () => {
  withFixture({ css: globalsCss.replace("--ink: #121212;", "--ink: #888888;") }, ({ failures }) => {
    assert.equal(failures.length, 2);
    assert.match(failures[0], /`--color-foreground` on `--color-background`.*needs 4\.5:1/);
    assert.match(failures[1], /`--color-style-foreground` on `--color-style`/);
  });
});

test("holds a non-text pairing to 3:1, not 4.5:1", () => {
  withFixture({}, ({ results }) => {
    const edge = results.find((r) => r.label.startsWith("`--color-edge`"));
    assert.ok(edge.ratio < 4.5 && edge.ratio >= 3, `edge ratio ${edge.ratio}`);
    assert.equal(edge.needs, 3);
  });
});

test("checks every data-beer-style block against its own foreground", () => {
  withFixture({ css: globalsCss.replace("--dark: #141210;", "--dark: #d0d0d0;") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /data-beer-style="stout"/);
  });
});

test("fails a style block that sets only one of the pair", () => {
  withFixture({ css: globalsCss.replace("  --style-foreground: var(--white);\n", "") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /data-beer-style="stout".*--style-foreground/);
  });
});

test("fails a pairing that names a token no @theme block declares", () => {
  withFixture(
    { design: designMd.replace("| `--color-edge` | `--color-background` | non-text |", "| `--color-gone` | `--color-background` | text |") },
    ({ failures }) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /`--color-gone`.*no @theme block declares/);
    },
  );
});

test("fails a value it cannot resolve to a hex colour", () => {
  withFixture(
    { css: globalsCss.replace("--edge: var(--grey);", "--edge: color-mix(in srgb, var(--grey) 50%, white);") },
    ({ failures }) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /`--color-edge`.*cannot resolve/);
    },
  );
});

test("fails an unknown pairing kind", () => {
  withFixture({ design: designMd.replace("| non-text |", "| decorative |") }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /kind "decorative"/);
  });
});

test("fails when the Contrast pairings section is absent", () => {
  withFixture({ design: "# Design fixture\n\n## Semantic tokens\n" }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no "## Contrast pairings" section/);
  });
});

test("the real repository's palette meets AA", () => {
  const { failures } = checkContrast(resolve(import.meta.dirname, ".."));
  assert.deepEqual(failures, []);
});
