import { fireEvent, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ChoiceRow } from "./ChoiceRow";

const ONE_OF_TWO = { index: 1, count: 2 };
const LONG = "Oluttehtaiden ja panimoiden yhteisomistuksessa toimiva erikoisolutpanimo";

afterEach(() => jest.restoreAllMocks());

describe("ChoiceRow", () => {
  it.each(MODES)("marks the chosen row and leaves the others plain in %s", async (mode) => {
    systemIs(mode);
    const colors = theme.colors[mode];
    await renderWithLocale(
      <>
        <ChoiceRow label="Nimi" position={ONE_OF_TWO} selected onPress={() => undefined} />
        <ChoiceRow label="Vahvuus" position={{ index: 2, count: 2 }} selected={false} onPress={() => undefined} />
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
    await renderWithLocale(<ChoiceRow label="Panimo" position={ONE_OF_TWO} sub="Helsinki · Suomi" leading={<Text>swatch</Text>} selected={false} onPress={onPress} />, "fi");

    await fireEvent.press(screen.getByRole("button", { name: "Panimo, Helsinki · Suomi" }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("swatch")).toBeOnTheScreen();
  });

  it("can stand as a bordered block of its own", async () => {
    systemIs("light");
    await renderWithLocale(<ChoiceRow bordered label="Nimi" position={ONE_OF_TWO} selected={false} onPress={() => undefined} />);

    expect(screen.getByRole("button", { name: "Nimi" })).toHaveStyle({ borderWidth: 1.5, borderColor: theme.colors.light.border, borderRadius: theme.radius.card });
  });

  it.each(MODES)("writes a long Finnish name and its supporting line whole at the largest text size in %s", async (mode) => {
    systemIs(mode);
    await withLargestFont(async () => {
      await renderWithLocale(<ChoiceRow label={LONG} position={ONE_OF_TWO} sub="Jyväskylä · Suomi" selected onPress={() => undefined} />, "fi");

      expect(screen.getByText(LONG)).toBeOnTheScreen();
      expect(screen.getByText("Jyväskylä · Suomi")).toBeOnTheScreen();
      expectScalesWithText();
    });
  });

  it.each([
    ["en", "2 of 5"],
    ["fi", "vaihtoehto 2, yhteensä 5"],
  ] as const)("on iOS says its place in the set from the app's strings, in %s, beside a name that stays the option's alone", async (locale, spoken) => {
    jest.replaceProperty(ReactNative.Platform, "OS", "ios");
    await renderWithLocale(<ChoiceRow label="Gose" position={{ index: 2, count: 5 }} selected onPress={() => undefined} />, locale);

    const row = screen.getByRole("button", { name: "Gose", selected: true });
    expect(row).toHaveAccessibilityValue({ text: spoken });
  });

  it("on Android leaves the place to the radio role, which TalkBack speaks in the device's language", async () => {
    jest.replaceProperty(ReactNative.Platform, "OS", "android");
    await renderWithLocale(<ChoiceRow label="Gose" position={{ index: 2, count: 5 }} selected onPress={() => undefined} />, "fi");

    const row = screen.getByRole("radio", { name: "Gose", checked: true });
    expect(row.props.accessibilityValue?.text).toBeUndefined();
  });
});
