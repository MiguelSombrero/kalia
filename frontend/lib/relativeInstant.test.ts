import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeInstant } from "./relativeInstant";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("formatRelativeInstant", () => {
  it("renders just under a minute as 'just now', English", () => {
    expect(formatRelativeInstant("2026-09-13T11:59:01.000Z", "en", now).text).toBe("just now");
  });

  it("renders just under a minute as 'just now', Finnish", () => {
    expect(formatRelativeInstant("2026-09-13T11:59:01.000Z", "fi", now).text).toBe("juuri nyt");
  });

  it("renders exactly a minute as one minute ago, English", () => {
    expect(formatRelativeInstant("2026-09-13T11:59:00.000Z", "en", now).text).toBe("1 minute ago");
  });

  it("renders exactly a minute as one minute ago, Finnish", () => {
    expect(formatRelativeInstant("2026-09-13T11:59:00.000Z", "fi", now).text).toBe("1 minuutti sitten");
  });

  it("renders minutes within the hour, English", () => {
    expect(formatRelativeInstant("2026-09-13T11:45:00.000Z", "en", now).text).toBe("15 minutes ago");
  });

  it("renders just under an hour as minutes rather than rolling over, English", () => {
    expect(formatRelativeInstant("2026-09-13T11:00:00.001Z", "en", now).text).toBe("59 minutes ago");
  });

  it("renders exactly an hour as one hour ago, English", () => {
    expect(formatRelativeInstant("2026-09-13T11:00:00.000Z", "en", now).text).toBe("1 hour ago");
  });

  it("renders hours within the day, Finnish", () => {
    expect(formatRelativeInstant("2026-09-13T07:00:00.000Z", "fi", now).text).toBe("5 tuntia sitten");
  });

  it("renders exactly a day as yesterday, English", () => {
    expect(formatRelativeInstant("2026-09-12T12:00:00.000Z", "en", now).text).toBe("yesterday");
  });

  it("renders exactly a day as yesterday, Finnish", () => {
    expect(formatRelativeInstant("2026-09-12T12:00:00.000Z", "fi", now).text).toBe("eilen");
  });

  it("renders several days within the week, English", () => {
    expect(formatRelativeInstant("2026-09-08T12:00:00.000Z", "en", now).text).toBe("5 days ago");
  });

  it("renders just under a week as days, not an absolute date, English", () => {
    expect(formatRelativeInstant("2026-09-06T12:00:00.001Z", "en", now).text).toBe("6 days ago");
  });

  it("renders exactly a week as a localised absolute date, English", () => {
    expect(formatRelativeInstant("2026-09-06T12:00:00.000Z", "en", now).text).toBe("Sep 6, 2026");
  });

  it("renders exactly a week as a localised absolute date, Finnish", () => {
    expect(formatRelativeInstant("2026-09-06T12:00:00.000Z", "fi", now).text).toBe("6.9.2026");
  });

  it("renders an instant well past a week as a localised absolute date", () => {
    expect(formatRelativeInstant("2026-01-01T00:00:00.000Z", "en", now).text).toBe("Jan 1, 2026");
  });

  it("carries the exact instant in the datetime field for a relative case", () => {
    const instant = "2026-09-13T11:59:00.000Z";
    expect(formatRelativeInstant(instant, "en", now).datetime).toBe(instant);
  });

  it("carries the exact instant in the datetime field for the absolute-date case", () => {
    const instant = "2026-01-01T00:00:00.000Z";
    expect(formatRelativeInstant(instant, "en", now).datetime).toBe(instant);
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
});
