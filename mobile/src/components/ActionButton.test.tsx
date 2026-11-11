import { fireEvent, screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ActionButton } from "./ActionButton";

describe("ActionButton", () => {
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
