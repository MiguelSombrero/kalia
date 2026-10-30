import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeInstant } from "./relativeInstant";

const now = new Date("2026-09-13T12:00:00.000Z");

// Each row is a point on the scale formatRelativeInstant walks: under a
// minute, minutes, hours, days, then an absolute date from a week out. The
// boundary rows (":00.000Z" against ":00.001Z") are the ones that pin where
// each unit gives way to the next.
describe.each([
  ["under a minute", "2026-09-13T11:59:01.000Z", "just now", "juuri nyt"],
  ["exactly a minute", "2026-09-13T11:59:00.000Z", "1 minute ago", "1 minuutti sitten"],
  ["minutes within the hour", "2026-09-13T11:45:00.000Z", "15 minutes ago", "15 minuuttia sitten"],
  ["just under an hour", "2026-09-13T11:00:00.001Z", "59 minutes ago", "59 minuuttia sitten"],
  ["exactly an hour", "2026-09-13T11:00:00.000Z", "1 hour ago", "1 tunti sitten"],
  ["hours within the day", "2026-09-13T07:00:00.000Z", "5 hours ago", "5 tuntia sitten"],
  ["exactly a day", "2026-09-12T12:00:00.000Z", "yesterday", "eilen"],
  ["days within the week", "2026-09-08T12:00:00.000Z", "5 days ago", "5 päivää sitten"],
  ["just under a week", "2026-09-06T12:00:00.001Z", "6 days ago", "6 päivää sitten"],
  ["exactly a week", "2026-09-06T12:00:00.000Z", "Sep 6, 2026", "6.9.2026"],
  ["well past a week", "2026-01-01T00:00:00.000Z", "Jan 1, 2026", "1.1.2026"],
])("%s", (_span, instant, english, finnish) => {
  it(`reads as "${english}" in English, carrying the exact instant`, () => {
    const { text, datetime } = formatRelativeInstant(instant, "en", now);

    expect(text).toBe(english);
    // The wording is approximate; the datetime attribute never is.
    expect(datetime).toBe(instant);
  });

  it(`reads as "${finnish}" in Finnish`, () => {
    expect(formatRelativeInstant(instant, "fi", now).text).toBe(finnish);
  });
});

describe("determinism", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders identically for the same explicit now, even as the wall clock advances", () => {
    vi.setSystemTime(now);
    const first = formatRelativeInstant("2026-09-13T11:59:00.000Z", "en", now);

    vi.setSystemTime(new Date(now.getTime() + 5_000));
    const second = formatRelativeInstant("2026-09-13T11:59:00.000Z", "en", now);

    expect(second).toEqual(first);
  });
});
