import { fireEvent, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { theme } from "@/lib/design/theme.generated";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { ActionButton } from "./ActionButton";

describe("ActionButton", () => {
  it("is not pressable while disabled, and says so", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<ActionButton label="Show 4 beers" onPress={onPress} disabled />);

    const button = screen.getByRole("button", { name: "Show 4 beers" });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("sets no space around itself: its parent places it with gap", async () => {
    await renderWithLocale(<ActionButton label="Show all" onPress={() => undefined} />);

    expect(StyleSheet.flatten(screen.getByRole("button", { name: "Show all" }).props.style).marginTop).toBeUndefined();
  });

  it("fills the main action with the action colour", async () => {
    await renderWithLocale(<ActionButton label="Sign in" onPress={() => undefined} />);

    expect(screen.getByRole("button", { name: "Sign in" })).toHaveStyle({ backgroundColor: theme.colors.light.primary });
  });

  it("draws a second action as an ink-edged outline so only one block is cobalt", async () => {
    await renderWithLocale(<ActionButton label="Close" onPress={() => undefined} variant="secondary" />);

    expect(screen.getByRole("button", { name: "Close" })).toHaveStyle({
      backgroundColor: theme.colors.light.background,
      borderColor: theme.colors.light.border,
      borderWidth: 2,
    });
    expect(screen.getByText("Close")).toHaveStyle({ color: theme.colors.light.foreground });
  });

  it("presses and is not pressable while busy", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<ActionButton label="Sign out" onPress={onPress} busy />);

    await fireEvent.press(screen.getByRole("button", { name: "Sign out" }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
