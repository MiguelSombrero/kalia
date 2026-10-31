import { resolveLocale } from "./resolveLocale";

describe("resolveLocale", () => {
  it("picks the device's first supported language", () => {
    expect(resolveLocale(["fi", "en"])).toBe("fi");
    expect(resolveLocale(["en", "fi"])).toBe("en");
  });

  it("skips an unsupported language the device prefers more", () => {
    expect(resolveLocale(["sv", "fi"])).toBe("fi");
  });

  it("falls back to the default locale when none is supported", () => {
    expect(resolveLocale(["de", "sv"])).toBe("en");
    expect(resolveLocale([])).toBe("en");
  });

  it("ignores a language the platform could not name", () => {
    expect(resolveLocale([null, "fi"])).toBe("fi");
  });
});
