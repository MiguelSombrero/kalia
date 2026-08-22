import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./formatRelativeDate";

const now = new Date("2026-08-16T00:00:00Z");

describe("formatRelativeDate", () => {
  it("renders a multi-year past date in English", () => {
    expect(formatRelativeDate("2023-08-16", "en", now)).toBe("3 years ago");
  });

  it("renders a future date within a year in months, English", () => {
    expect(formatRelativeDate("2027-04-16", "en", now)).toBe("in 8 months");
  });

  it("renders a recent past date in months, English", () => {
    expect(formatRelativeDate("2026-06-16", "en", now)).toBe("2 months ago");
  });

  it("renders a multi-year past date in Finnish", () => {
    expect(formatRelativeDate("2023-08-16", "fi", now)).toContain("vuotta");
  });

  it("renders a future date in Finnish", () => {
    expect(formatRelativeDate("2027-04-16", "fi", now)).toContain("kuukau");
  });
});
