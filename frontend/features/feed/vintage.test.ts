import { describe, expect, it } from "vitest";
import { vintageYear } from "./vintage";

describe("vintageYear", () => {
  it("extracts the year from a LocalDate string", () => {
    expect(vintageYear("2019-03-15")).toBe("2019");
  });

  it("returns undefined for a bottle with no recorded brewed date", () => {
    expect(vintageYear(undefined)).toBeUndefined();
  });
});
