import { fireEvent, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { Sheet } from "./Sheet";

afterEach(() => jest.restoreAllMocks());

describe("Sheet", () => {
  it.each(MODES)("rests on the raised surface and writes its title in the foreground in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(
      <Sheet title="Lisää olut" closeLabel="Sulje" onClose={() => undefined}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    expect(screen.getByTestId("sheet")).toHaveStyle({ backgroundColor: theme.colors[mode].surface });
    expect(screen.getByRole("heading", { name: "Lisää olut" })).toHaveStyle({ color: theme.colors[mode].foreground });
  });

  it("closes", async () => {
    const onClose = jest.fn();
    await renderWithLocale(
      <Sheet title="Kirjaudu sisään" closeLabel="Sulje" onClose={onClose}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Sulje" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can hold its close while something is under way", async () => {
    const onClose = jest.fn();
    await renderWithLocale(
      <Sheet title="Kirjaudu sisään" closeLabel="Sulje" onClose={onClose} closeDisabled>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Sulje" }));

    expect(screen.getByRole("button", { name: "Sulje" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("places a trailing action, a bar and a footer around its body", async () => {
    await renderWithLocale(
      <Sheet title="Suodattimet" closeLabel="Sulje" onClose={() => undefined} trailing={<Text>trailing</Text>} bar={<Text>bar</Text>} footer={<Text>footer</Text>}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    for (const part of ["trailing", "bar", "footer", "body"]) expect(screen.getByText(part)).toBeOnTheScreen();
  });

  it("keeps its close, title and body at the largest text size with a long Finnish title", async () => {
    await withLargestFont(async () => {
      await renderWithLocale(
        <Sheet title="Panimoiden yhteisomistuksessa toimiva erikoisolutpanimo" closeLabel="‹ Suodattimet" closeAccessibilityLabel="Takaisin suodattimiin" onClose={() => undefined}>
          <Text>body</Text>
        </Sheet>,
        "fi",
      );

      expect(screen.getByRole("button", { name: "Takaisin suodattimiin" })).toBeOnTheScreen();
      expect(screen.getByRole("heading", { name: "Panimoiden yhteisomistuksessa toimiva erikoisolutpanimo" })).toBeOnTheScreen();
    });
  });
});
