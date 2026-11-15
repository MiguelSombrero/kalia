import { act, renderHook } from "@testing-library/react-native";

import { emptyFilters } from "../filters/model";
import { useFiltersStore } from "../filters/store";
import { PAUSE_MS } from "./useDebounced";
import { useSearchDraft } from "./useSearchDraft";

beforeEach(() => {
  jest.useFakeTimers();
  useFiltersStore.setState({ applied: emptyFilters(), text: "" });
});
afterEach(() => jest.useRealTimers());

const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

describe("useSearchDraft", () => {
  it("applies the text as the query once it has rested for the pause, from two characters", async () => {
    const { result } = await renderHook(() => useSearchDraft());

    await act(async () => result.current.setText("ipa"));
    await advance(PAUSE_MS - 1);
    expect(useFiltersStore.getState().applied.query).toBe("");

    await advance(1);
    expect(useFiltersStore.getState().applied.query).toBe("ipa");
  });

  it("leaves a single character out of the query", async () => {
    const { result } = await renderHook(() => useSearchDraft());

    await act(async () => result.current.setText("i"));
    await advance(PAUSE_MS);

    expect(useFiltersStore.getState().applied.query).toBe("");
  });

  it("applies the text at once when the keyboard's search key is pressed", async () => {
    const { result } = await renderHook(() => useSearchDraft());

    await act(async () => result.current.setText("stout"));
    await act(async () => result.current.submit());

    expect(useFiltersStore.getState().applied.query).toBe("stout");
  });
});
