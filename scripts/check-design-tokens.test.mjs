#!/usr/bin/env node
// Fixture self-test for check-design-tokens.mjs: the real tree never trips the
// check once docs/design.md is current, so without fixtures a broken checker
// would stay green.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { checkDesignTokens } from "./check-design-tokens.mjs";

const globalsCss = [
  '@import "tailwindcss";',
  "",
  ":root {",
  "  --ink-900: #111111;",
  "  --primary: var(--ink-900);",
  "}",
  "",
  "@theme inline {",
  "  --color-primary: var(--primary);",
  "  /* --font-example comes from next/font; a comment must not count */",
  "  --font-sans: var(--font-example, sans-serif);",
  "}",
  "",
  "body {",
  "  --not-a-theme-token: 0;",
  "}",
  "",
].join("\n");

const designMd = [
  "# Design fixture",
  "",
  "## Semantic tokens",
  "",
  "### Colour",
  "",
  "| Token | Means | Reach for it when |",
  "|---|---|---|",
  "| `--color-primary` | The action colour | Something acts |",
  "",
  "### Type",
  "",
  "| Token | Means | Reach for it when |",
  "|---|---|---|",
  "| `--font-sans` | The reading face | Almost always |",
  "",
  "## Layout principles",
  "",
  "| `--color-outside-the-section` | Not a token row | ignored |",
  "",
].join("\n");

function fixture({ css = globalsCss, design = designMd } = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "design-token-check-"));
  mkdirSync(resolve(root, "frontend/app"), { recursive: true });
  mkdirSync(resolve(root, "docs"), { recursive: true });
  if (css !== null) writeFileSync(resolve(root, "frontend/app/globals.css"), css);
  if (design !== null) writeFileSync(resolve(root, "docs/design.md"), design);
  return root;
}

function withFixture(options, assertions) {
  const root = fixture(options);
  try {
    assertions(checkDesignTokens(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("passes when every @theme inline token has exactly one meaning row", () => {
  withFixture({}, (failures) => assert.deepEqual(failures, []));
});

test("fails when a token has no meaning row", () => {
  withFixture(
    { design: designMd.replace("| `--font-sans` | The reading face | Almost always |\n", "") },
    (failures) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /`--font-sans`.*no meaning row/);
    },
  );
});

test("fails when a row names a token @theme inline does not declare", () => {
  withFixture(
    {
      design: designMd.replace(
        "| `--color-primary` | The action colour | Something acts |",
        "| `--color-primary` | The action colour | Something acts |\n| `--color-gone` | Removed | never |",
      ),
    },
    (failures) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /`--color-gone`.*not declared/);
    },
  );
});

test("fails when a token has two meaning rows", () => {
  withFixture(
    {
      design: designMd.replace(
        "| `--font-sans` | The reading face | Almost always |",
        "| `--font-sans` | The reading face | Almost always |\n| `--font-sans` | Something else | Sometimes |",
      ),
    },
    (failures) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /`--font-sans`.*2 meaning rows/);
    },
  );
});

test("fails when the Semantic tokens section is absent", () => {
  withFixture({ design: "# Design fixture\n\n## Layout principles\n" }, (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no "## Semantic tokens" section/);
  });
});

test("fails when globals.css has no @theme inline block", () => {
  withFixture({ css: ":root {\n  --primary: #000000;\n}\n" }, (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /no `@theme inline` block/);
  });
});

test("fails when docs/design.md does not exist", () => {
  withFixture({ design: null }, (failures) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /docs\/design\.md not found/);
  });
});

test("the real repository's docs/design.md is current", () => {
  const root = resolve(import.meta.dirname, "..");
  assert.deepEqual(checkDesignTokens(root), []);
});
