import { describe, expect, it, vi } from "vitest";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("next/headers", () => ({ headers }));

import { resolveLocaleFromAcceptLanguage, resolveLocaleFromHeaders } from "./resolveLocale";

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

describe("resolveLocaleFromHeaders", () => {
  it("recovers the locale from the x-pathname header", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/fi/beers/abc" }));

    expect(await resolveLocaleFromHeaders()).toBe("fi");
  });

  it("falls back to the default locale when the header is missing", async () => {
    headers.mockResolvedValue(new Headers());

    expect(await resolveLocaleFromHeaders()).toBe("en");
  });

  it("falls back to the default locale for an unsupported locale segment", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/de/beers" }));

    expect(await resolveLocaleFromHeaders()).toBe("en");
  });
});
