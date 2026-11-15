import { act, renderHook } from "@testing-library/react-native";

import { PAUSE_MS, useDebounced } from "./useDebounced";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

describe("useDebounced", () => {
  it("starts on the value it is given", async () => {
    const { result } = await renderHook(() => useDebounced("ab"));

    expect(result.current).toBe("ab");
  });

  it("follows a change only once the value has stopped changing for the pause", async () => {
    const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebounced(value), { initialProps: { value: "ab" } });

    await rerender({ value: "abc" });
    await advance(PAUSE_MS - 1);
    expect(result.current).toBe("ab");

    await advance(1);
    expect(result.current).toBe("abc");
  });

  it("restarts the pause on each change, so only the last value is let through", async () => {
    const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebounced(value), { initialProps: { value: "a" } });

    await rerender({ value: "ab" });
    await advance(PAUSE_MS - 1);
    await rerender({ value: "abc" });
    await advance(PAUSE_MS - 1);
    expect(result.current).toBe("a");

    await advance(1);
    expect(result.current).toBe("abc");
  });
});
