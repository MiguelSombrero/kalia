import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./formatRelativeDate";

const now = new Date("2026-08-16T00:00:00Z");

describe("formatRelativeDate", () => {
  it("renders a span of years with two-unit precision in English", () => {
    expect(formatRelativeDate("2023-06-16", "en", now)).toBe("3 years and 2 months ago");
  });

  it("renders a span of years with two-unit precision in Finnish", () => {
    expect(formatRelativeDate("2023-06-16", "fi", now)).toBe("3 vuotta ja 2 kuukautta sitten");
  });

  it("renders a future span of years in the correct Finnish case", () => {
    expect(formatRelativeDate("2029-10-16", "fi", now)).toBe("3 vuoden ja 2 kuukauden päästä");
  });

  it("renders a span of months with two-unit precision in English", () => {
    expect(formatRelativeDate("2026-06-01", "en", now)).toBe("2 months and 15 days ago");
  });

  it("renders a whole number of years with one unit and no zero second unit", () => {
    expect(formatRelativeDate("2023-08-16", "en", now)).toBe("3 years ago");
  });

  it("renders a whole number of months with one unit and no zero second unit", () => {
    expect(formatRelativeDate("2026-06-16", "en", now)).toBe("2 months ago");
  });

  it("never lets the second unit reach the next unit up", () => {
    // Just under 3 whole years — a 30-day-month approximation would round
    // this to "3 years and 12 months ago"; the calendar-exact span caps at 11.
    expect(formatRelativeDate("2023-09-16", "en", now)).toBe("2 years and 11 months ago");
  });

  it("renders a future date within a year in months, English", () => {
    expect(formatRelativeDate("2027-04-16", "en", now)).toBe("in 8 months");
  });

  it("renders a recent past date in days, English", () => {
    expect(formatRelativeDate("2026-08-13", "en", now)).toBe("3 days ago");
  });

  it("renders a first unit of magnitude 1 as a number, not a bare word", () => {
    // numeric: "auto" would collapse -1 year to the literal "last year"
    // with no number part, breaking composition with the second unit.
    expect(formatRelativeDate("2025-05-16", "en", now)).toBe("1 year and 3 months ago");
  });

  it("renders a second unit of magnitude 1 as a number, not a bare word", () => {
    // numeric: "auto" would collapse -1 day to the literal "yesterday".
    expect(formatRelativeDate("2026-06-15", "en", now)).toBe("2 months and 1 day ago");
  });
});
