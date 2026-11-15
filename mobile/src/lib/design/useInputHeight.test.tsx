import { renderHook } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { theme } from "./theme.generated";
import { useInputHeight } from "./useInputHeight";

const original = Dimensions.get("window");
afterEach(() => Dimensions.set({ window: original, screen: Dimensions.get("screen") }));

const at = (fontScale: number) => Dimensions.set({ window: { ...original, fontScale }, screen: Dimensions.get("screen") });

describe("useInputHeight", () => {
  it("keeps a text field's tap target at the default text size", async () => {
    at(1);
    const { result } = await renderHook(() => useInputHeight());

    expect(result.current).toEqual({ minHeight: theme.spacing.touch });
  });

  it("grows a text field with the system text size, a line of text and its padding, so a placeholder is not cut", async () => {
    at(3.1);
    const { result } = await renderHook(() => useInputHeight());

    expect(result.current.minHeight).toBeGreaterThanOrEqual(theme.typography.body.lineHeight * 3.1 + 2 * theme.spacing.small);
  });
});
