import { focusManager } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useAppStateFocus } from "./useAppStateFocus";

describe("useAppStateFocus", () => {
  it("tells TanStack Query the app is focused only while it is in the foreground", async () => {
    let onChange: (state: AppStateStatus) => void = () => {};
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
      onChange = listener;
      return { remove };
    });

    const { unmount } = await renderHook(() => useAppStateFocus());

    onChange("background");
    expect(focusManager.isFocused()).toBe(false);
    onChange("active");
    expect(focusManager.isFocused()).toBe(true);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
