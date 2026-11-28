import { bottleFormSchema } from "./bottleFormSchema";

const issues = (brewedDate: string | null, bestBeforeDate: string | null) =>
  bottleFormSchema.safeParse({ containerType: "BOTTLE", quantity: 1, brewedDate, bestBeforeDate }).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ?? [];

describe("applyBottleDateRules", () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 28, 0, 30) }));
  afterEach(() => jest.useRealTimers());

  it("takes a bottle brewed on the phone's own today, and refuses tomorrow", () => {
    expect(issues("2026-11-28", null)).toEqual([]);
    expect(issues("2026-11-29", null)).toEqual([["brewedDate", "cellar.bottle.dateError.brewedInFuture"]]);
  });

  it("wants best-before strictly after brewed", () => {
    expect(issues("2025-05-12", "2025-05-12")).toEqual([["bestBeforeDate", "cellar.bottle.dateError.bestBeforeNotAfterBrewed"]]);
    expect(issues("2025-05-12", "2025-05-11")).toEqual([["bestBeforeDate", "cellar.bottle.dateError.bestBeforeNotAfterBrewed"]]);
    expect(issues("2025-05-12", "2025-05-13")).toEqual([]);
  });

  it("takes either day alone", () => {
    expect(issues("2025-05-12", null)).toEqual([]);
    expect(issues(null, "2001-01-01")).toEqual([]);
  });
});
