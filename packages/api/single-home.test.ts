import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import * as bounds from "./src/core/bounds";

// A bound written out in an app is a copy that drifts from the one the guard in
// src/core/bounds.test.ts holds to the spec. Importing the constant is the only
// way an app states one, so this finds a second declaration or a second
// spelling of a pattern.
const repository = path.resolve(import.meta.dirname, "../..");
const SKIPPED = new Set(["node_modules", ".next", "ios", "android", ".expo", "coverage", "dist", "build", "test-results", "playwright-report"]);

const sourcesOf = (app: string): string[] => {
  const found: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIPPED.has(entry.name)) walk(path.join(directory, entry.name));
      } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
        found.push(path.join(directory, entry.name));
      }
    }
  };
  walk(path.join(repository, app));
  return found;
};

const sources = ["web", "mobile"].flatMap(sourcesOf).map((file) => ({
  name: path.relative(repository, file),
  text: readFileSync(file, "utf8"),
}));

const patterns = Object.entries(bounds)
  .filter((entry): entry is [string, RegExp] => entry[1] instanceof RegExp)
  .map(([name, pattern]) => ({ name, written: pattern.source.replace(/^\^/, "").replace(/\$$/, "") }));

const numbers = Object.entries(bounds)
  .filter(([, value]) => typeof value === "number")
  .map(([name]) => name);

describe("the request bounds have one home, @kalia/api/bounds", () => {
  it("finds the apps' sources, so an empty scan cannot pass", () => {
    expect(sources.some((file) => file.name.startsWith("web/features/"))).toBe(true);
    expect(sources.some((file) => file.name.startsWith("mobile/src/"))).toBe(true);
  });

  it.each(patterns)("no app writes out $name", ({ written }) => {
    const copies = sources.filter((file) => file.text.includes(written)).map((file) => file.name);
    expect(copies).toEqual([]);
  });

  it.each(numbers)("no app declares its own %s", (name) => {
    const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`);
    const copies = sources.filter((file) => declaration.test(file.text)).map((file) => file.name);
    expect(copies).toEqual([]);
  });
});
