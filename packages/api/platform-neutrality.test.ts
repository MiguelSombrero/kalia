import { readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// The real packages pass this rule, so a pattern that matched nothing would
// stay green; linting each committed violating fixture, placed as if it sat
// in either package, is what shows each one still fires (architecture.md §7).
const packagesDir = path.resolve(import.meta.dirname, "..");
const eslint = new ESLint({ cwd: packagesDir });

const crossings = [
  { fixture: "imports-next" },
  { fixture: "imports-react-dom" },
  { fixture: "imports-react-native" },
  { fixture: "imports-the-web-by-package-name" },
  { fixture: "imports-the-web-by-path" },
  { fixture: "imports-the-mobile-app-by-path" },
  { fixture: "imports-through-an-app-alias" },
];

describe("shared packages stay platform-neutral (ADR-0092)", () => {
  describe.each(["api", "locales"])("@kalia/%s", (pkg) => {
    it.each(crossings)("rejects $fixture", async ({ fixture }) => {
      const source = readFileSync(path.join(packagesDir, "eslint-fixtures/neutrality", `${fixture}.ts`), "utf8");

      const [result] = await eslint.lintText(source, { filePath: path.join(packagesDir, pkg, "src/probe.ts") });

      expect(result.messages.map((m) => [m.ruleId, m.message])).toEqual([
        ["no-restricted-imports", expect.stringContaining("A shared package must not import")],
      ]);
    });
  });

  it("lets a package import what is neutral: React, TanStack Query, its own files", async () => {
    const source =
      'import { useQuery } from "@tanstack/react-query";\nimport { useState } from "react";\nimport { isApiError } from "./core/api-error";\n\nexport const probe = [useQuery, useState, isApiError];\n';

    const [result] = await eslint.lintText(source, { filePath: path.join(packagesDir, "api/src/probe.ts") });

    expect(result.messages).toEqual([]);
  });
});
