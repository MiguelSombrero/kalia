import { fireEvent, screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { TextButton } from "./TextButton";

afterEach(() => jest.restoreAllMocks());

describe("TextButton", () => {
  it.each(MODES)("writes its label in the action colour in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<TextButton label="Sulje" onPress={() => undefined} />);

    expect(screen.getByRole("button", { name: "Sulje" })).toBeOnTheScreen();
    expect(screen.getByText("Sulje")).toHaveStyle({ color: theme.colors[mode].primary });
  });

  it("presses, and can be named apart from what it shows", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<TextButton label="‹ Suodattimet" accessibilityLabel="Takaisin suodattimiin" onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Takaisin suodattimiin" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("is not pressable while disabled, and says so", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<TextButton label="Sulje" onPress={onPress} disabled />);

    await fireEvent.press(screen.getByRole("button", { name: "Sulje" }));

    expect(screen.getByRole("button", { name: "Sulje" })).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("keeps a touch target and grows with the text size", async () => {
    await withLargestFont(async () => {
      await renderWithLocale(<TextButton label="Poista kaikki suodattimet" onPress={() => undefined} />);

      expect(screen.getByRole("button", { name: "Poista kaikki suodattimet" })).toHaveStyle({ minHeight: theme.spacing.touch });
      expectScalesWithText();
    });
  });
});
