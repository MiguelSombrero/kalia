import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const resolve = createRequire(import.meta.url);

// The web's import boundaries classify a file by its folder, and the barrel
// sits in none of the per-tag ones, so a feature importing it would reach
// every tag. Leaving it out of `exports` is what keeps it unreachable.
describe("@kalia/api exports", () => {
  it("do not expose the generated barrel", () => {
    expect(() => resolve.resolve("@kalia/api/generated/index")).toThrow(/not defined by "exports"/);
  });

  it("expose each tag's operations and the shared models", () => {
    expect(resolve.resolve("@kalia/api/generated/catalog/catalog")).toMatch(/generated\/catalog\/catalog\.ts$/);
    expect(resolve.resolve("@kalia/api/generated/models")).toMatch(/generated\/models\/index\.ts$/);
  });
});
