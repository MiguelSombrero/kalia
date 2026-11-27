import { containerLabelKey, formatBottleDate, inVintageOrder, isPastBestBefore, localToday, vintageOf } from "./bottles";

const bottle = (id: string, brewedDate?: string, bestBeforeDate?: string) => ({
  id,
  entryId: "e",
  containerType: "BOTTLE" as const,
  ...(brewedDate ? { brewedDate } : {}),
  ...(bestBeforeDate ? { bestBeforeDate } : {}),
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

describe("a bottle's dates", () => {
  it("takes its vintage from the brewed year and has none without a brewed date", () => {
    expect(vintageOf({ brewedDate: "2024-03-10" })).toBe("2024");
    expect(vintageOf({})).toBeNull();
    expect(vintageOf({ brewedDate: null })).toBeNull();
  });

  it("is past its best-before date only strictly before today, and never without one", () => {
    expect(isPastBestBefore({ bestBeforeDate: "2026-11-22" }, "2026-11-23")).toBe(true);
    expect(isPastBestBefore({ bestBeforeDate: "2026-11-23" }, "2026-11-23")).toBe(false);
    expect(isPastBestBefore({ bestBeforeDate: "2027-01-01" }, "2026-11-23")).toBe(false);
    expect(isPastBestBefore({}, "2026-11-23")).toBe(false);
    expect(isPastBestBefore({ bestBeforeDate: null }, "2026-11-23")).toBe(false);
  });

  it("names today by the phone's calendar day, not by UTC", () => {
    expect(localToday(new Date(2026, 10, 3, 23, 59))).toBe("2026-11-03");
    expect(localToday(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });

  it.each([
    ["en", "Mar 10, 2027"],
    ["fi", "10.3.2027"],
  ])("formats a day without a time zone, so it never reads as the day before, in %s", (language, expected) => {
    expect(formatBottleDate("2027-03-10", language)).toBe(expected);
  });
});

it("shows a date it cannot read as it was written, rather than failing", () => {
  expect(formatBottleDate("not-a-date", "en")).toBe("not-a-date");
});

describe("inVintageOrder", () => {
  it("puts the oldest brew first and the bottles with no brewed date last, earlier best-before first among equals", () => {
    const ordered = inVintageOrder([
      bottle("undated"),
      bottle("2025", "2025-09-01", "2028-09-01"),
      bottle("2023-late", "2023-02-14", "2027-02-14"),
      bottle("2023-early", "2023-02-14", "2026-02-14"),
      bottle("no-brewed-with-best", undefined, "2027-08-01"),
    ]);

    expect(ordered.map((b) => b.id)).toEqual(["2023-early", "2023-late", "2025", "no-brewed-with-best", "undated"]);
  });

  it("leaves its input untouched", () => {
    const input = [bottle("b", "2025-01-01"), bottle("a", "2020-01-01")];
    inVintageOrder(input);
    expect(input.map((b) => b.id)).toEqual(["b", "a"]);
  });
});

describe("containerLabelKey", () => {
  it("names the containers it knows and falls back for one it does not", () => {
    expect(containerLabelKey("CAN")).toBe("cellar.bottle.container.CAN");
    expect(containerLabelKey("GROWLER")).toBe("unknownValue");
  });
});
