import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLocale, locales, resources } from "./index";

// Dotted path of every string in a bundle, so a key nested differently in
// one language counts as missing in both.
const keysOf = (node: unknown, prefix = ""): string[] =>
  typeof node === "object" && node !== null
    ? Object.entries(node).flatMap(([key, value]) => keysOf(value, prefix ? `${prefix}.${key}` : key))
    : [prefix];

describe("the language bundles", () => {
  it.each(Object.keys(resources.en) as (keyof typeof resources.en)[])(
    "hold the same keys in every language: %s",
    (namespace) => {
      const en = keysOf(resources.en[namespace]);
      const fi = keysOf(resources.fi[namespace]);

      expect(en.filter((key) => !fi.includes(key)), "in en, missing from fi").toEqual([]);
      expect(fi.filter((key) => !en.includes(key)), "in fi, missing from en").toEqual([]);
    },
  );
});

describe("the supported locales", () => {
  it("are exactly the languages with a bundle, and include the default", () => {
    expect([...locales].sort()).toEqual(Object.keys(resources).sort());
    expect(locales).toContain(defaultLocale);
  });
});

describe("the package's root export", () => {
  // Metro fails the whole bundle on a call it cannot resolve statically, so a
  // dynamic import() in what the mobile app imports breaks it at run time only.
  it("holds no dynamic import()", () => {
    expect(readFileSync(`${import.meta.dirname}/index.ts`, "utf8")).not.toMatch(/\bimport\s*\(/);
  });
});
