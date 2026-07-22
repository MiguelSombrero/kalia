import { describe, expect, it } from "vitest";
import { resolveLocaleFromAcceptLanguage } from "./resolveLocale";

describe("resolveLocaleFromAcceptLanguage", () => {
  it("picks a supported locale from a weighted header", () => {
    expect(resolveLocaleFromAcceptLanguage("fi,en;q=0.5")).toBe("fi");
    expect(resolveLocaleFromAcceptLanguage("en-US,en;q=0.9,fi;q=0.8")).toBe("en");
  });

  it("matches on the primary subtag (fi-FI -> fi)", () => {
    expect(resolveLocaleFromAcceptLanguage("fi-FI,fi;q=0.9")).toBe("fi");
  });

  it("falls back to the default locale when nothing matches", () => {
    expect(resolveLocaleFromAcceptLanguage("de-DE,de;q=0.9,sv;q=0.8")).toBe("en");
  });

  it("falls back to the default locale for a missing header", () => {
    expect(resolveLocaleFromAcceptLanguage(null)).toBe("en");
  });
});
