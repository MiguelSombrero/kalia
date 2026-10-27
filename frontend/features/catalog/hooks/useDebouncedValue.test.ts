import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("holds the old value until the value has stopped changing", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: "Ö" } });

    rerender({ value: "Öö" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: "Öö B" });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("Ö");

    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("Öö B");
  });
});
