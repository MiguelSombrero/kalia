import { describe, expect, it } from "vitest";

import { isLocale, locales } from "./index";

describe("isLocale", () => {
  it.each(locales)("accepts %s", (locale) => {
    expect(isLocale(locale)).toBe(true);
  });

  it.each(["", "de", "EN", "en-US", "fi "])("rejects %j", (value) => {
    expect(isLocale(value)).toBe(false);
  });
});
