import { describe, expect, it } from "vitest";
import { resources } from "./index";

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
