import { screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ScreenTitle } from "./ScreenTitle";

afterEach(() => jest.restoreAllMocks());

describe("ScreenTitle", () => {
  it.each(MODES)("is the screen's heading, in the foreground colour in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<ScreenTitle>Olutluettelo</ScreenTitle>, "fi");

    expect(screen.getByRole("heading", { name: "Olutluettelo" })).toHaveStyle({ color: theme.colors[mode].foreground });
  });

  it("stops growing at twice its size so one word still fits, and does not clip", async () => {
    await withLargestFont(async () => {
      await renderWithLocale(<ScreenTitle>Panimoiden yhteisomistus</ScreenTitle>, "fi");

      expect(screen.getByRole("heading", { name: "Panimoiden yhteisomistus" })).toHaveProp("maxFontSizeMultiplier", 2);
      expectScalesWithText();
    });
  });
});
