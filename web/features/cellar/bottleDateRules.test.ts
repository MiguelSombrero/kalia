import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyBottleDateRules, todayIso } from "./bottleDateRules";

const issuesFor = (values: { brewedDate?: string; bestBeforeDate?: string }) => {
  const addIssue = vi.fn();
  applyBottleDateRules(values, { addIssue } as unknown as z.RefinementCtx);
  return addIssue;
};

describe("applyBottleDateRules", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  // Asia/Kolkata (UTC+5:30, no DST) stays a fixed offset year-round, so this
  // instant reproduces reliably: 20:00 UTC on the 14th is already 01:30 local
  // on the 15th — the exact window a UTC-computed "today" gets wrong.
  it("accepts the user's local today during the UTC-previous-day window", () => {
    vi.stubEnv("TZ", "Asia/Kolkata");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-14T20:00:00Z"));

    expect(todayIso()).toBe("2024-01-15");
    expect(issuesFor({ brewedDate: "2024-01-15" })).not.toHaveBeenCalled();
  });
});
