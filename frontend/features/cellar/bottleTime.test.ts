import { describe, expect, it } from "vitest";
import { formatBottleDate, isPastBestBefore, relativeToLocalDay, vintageOf } from "./bottleTime";

describe("isPastBestBefore", () => {
  it("is not past on the best-before day itself", () => {
    expect(isPastBestBefore({ bestBeforeDate: "2026-10-09" }, "2026-10-09")).toBe(false);
  });

  it("is past from the following day", () => {
    expect(isPastBestBefore({ bestBeforeDate: "2026-10-09" }, "2026-10-10")).toBe(true);
  });

  it("is never past without a best-before date", () => {
    expect(isPastBestBefore({}, "2026-10-10")).toBe(false);
  });
});

describe("vintageOf", () => {
  it("is the brewed date's year", () => {
    expect(vintageOf({ brewedDate: "2021-10-04" })).toBe("2021");
  });

  it("is null without a brewed date", () => {
    expect(vintageOf({})).toBeNull();
  });
});

describe("formatBottleDate", () => {
  it("writes the calendar date it was given, in each locale's own form", () => {
    expect(formatBottleDate("2026-03-12", "fi")).toBe("12.3.2026");
    expect(formatBottleDate("2026-03-12", "en")).toBe("Mar 12, 2026");
  });
});

describe("relativeToLocalDay", () => {
  it("counts from the local day it is given, not from the clock", () => {
    expect(relativeToLocalDay("2026-10-08", "2026-10-09", "en")).toBe("yesterday");
    expect(relativeToLocalDay("2026-10-08", "2026-10-10", "en")).toBe("2 days ago");
  });
});
