import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { FieldRow } from "./FieldRow";

const LONG = "Oluttehtaiden ja panimoiden yhteisomistuksessa toimiva erikoisolutpanimo";

afterEach(() => jest.restoreAllMocks());

describe("FieldRow", () => {
  it.each(MODES)("shows its title and what is chosen in %s, and an unchosen value quietly", async (mode) => {
    systemIs(mode);
    const colors = theme.colors[mode];
    await renderWithLocale(
      <>
        <FieldRow title="Tyyli" value="IPA" empty={false} accessibilityLabel="Tyyli: IPA" onPress={() => undefined} />
        <FieldRow title="Panimo" value="Mikä tahansa panimo" empty accessibilityLabel="Panimo: Mikä tahansa panimo" onPress={() => undefined} />
      </>,
      "fi",
    );

    expect(screen.getByRole("button", { name: "Tyyli: IPA" })).toHaveStyle({ backgroundColor: colors.surface, borderColor: colors.border });
    expect(screen.getByText("IPA")).toHaveStyle({ color: colors.foreground });
    expect(screen.getByText("Mikä tahansa panimo")).toHaveStyle({ color: colors["muted-foreground"] });
    expect(screen.getByText("Tyyli")).toHaveStyle({ color: colors["muted-foreground"] });
  });

  it("opens its page and shows what leads it", async () => {
    const onPress = jest.fn();
    await renderWithLocale(<FieldRow title="Tyyli" value="IPA" empty={false} leading={<Text>swatch</Text>} accessibilityLabel="Tyyli: IPA" onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Tyyli: IPA" }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText("swatch")).toBeOnTheScreen();
  });

  it.each(MODES)("writes a long Finnish value whole at the largest text size in %s", async (mode) => {
    systemIs(mode);
    await withLargestFont(async () => {
      await renderWithLocale(<FieldRow title="Panimo" value={LONG} empty={false} accessibilityLabel={`Panimo: ${LONG}`} onPress={() => undefined} />, "fi");

      expect(screen.getByText(LONG)).toBeOnTheScreen();
      expectScalesWithText();
    });
  });
});
