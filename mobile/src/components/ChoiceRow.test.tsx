import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ChoiceRow } from "./ChoiceRow";

const LONG = "Oluttehtaiden ja panimoiden yhteisomistuksessa toimiva erikoisolutpanimo";

afterEach(() => jest.restoreAllMocks());

describe("ChoiceRow", () => {
  it.each(MODES)("marks the chosen row and leaves the others plain in %s", async (mode) => {
    systemIs(mode);
    const colors = theme.colors[mode];
    await renderWithLocale(
      <>
        <ChoiceRow label="Nimi" selected onPress={() => undefined} />
        <ChoiceRow label="Vahvuus" selected={false} onPress={() => undefined} />
      </>,
      "fi",
    );

    expect(screen.getByRole("button", { name: "Nimi", selected: true })).toHaveStyle({ backgroundColor: colors.accent });
    expect(screen.getByText("Nimi")).toHaveStyle({ color: colors["accent-foreground"] });
    expect(screen.getByRole("button", { name: "Vahvuus", selected: false })).toHaveStyle({ backgroundColor: "transparent" });
    expect(screen.getByText("Vahvuus")).toHaveStyle({ color: colors.foreground });
    expect(screen.getAllByText("✓")).toHaveLength(1);
  });

  it("names its supporting line with it, shows what leads it and presses", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<ChoiceRow label="Panimo" sub="Helsinki · Suomi" leading={<Text>swatch</Text>} selected={false} onPress={onPress} />, "fi");

    await fireEvent.press(screen.getByRole("button", { name: "Panimo, Helsinki · Suomi" }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("swatch")).toBeOnTheScreen();
  });

  it("can stand as a bordered block of its own", async () => {
    systemIs("light");
    await renderWithLocale(<ChoiceRow bordered label="Nimi" selected={false} onPress={() => undefined} />);

    expect(screen.getByRole("button", { name: "Nimi" })).toHaveStyle({ borderWidth: 1.5, borderColor: theme.colors.light.border, borderRadius: theme.radius.card });
  });

  it.each(MODES)("writes a long Finnish name and its supporting line whole at the largest text size in %s", async (mode) => {
    systemIs(mode);
    await withLargestFont(async () => {
      await renderWithLocale(<ChoiceRow label={LONG} sub="Jyväskylä · Suomi" selected onPress={() => undefined} />, "fi");

      expect(screen.getByText(LONG)).toBeOnTheScreen();
      expect(screen.getByText("Jyväskylä · Suomi")).toBeOnTheScreen();
      expectScalesWithText();
    });
  });
});
