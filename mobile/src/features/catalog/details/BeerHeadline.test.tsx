import { screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { BeerHeadline } from "./BeerHeadline";

afterEach(() => jest.restoreAllMocks());

describe("BeerHeadline", () => {
  it("fills the card with the style colour and writes in the colour paired with it in light", async () => {
    systemIs("light");
    await renderWithLocale(<BeerHeadline name="Imperial" style="Imperial Stout" abv={9.5} language="en" />);

    const { background, foreground } = theme.variants["beer-style"].stout.light;
    expect(screen.getByTestId("beer-headline")).toHaveStyle({ backgroundColor: background });
    expect(screen.getByText("Imperial")).toHaveStyle({ color: foreground });
    expect(screen.queryByTestId("beer-slab")).toBeNull();
  });

  it("sits on a neutral card with the style colour only in its slab, in dark", async () => {
    systemIs("dark");
    await renderWithLocale(<BeerHeadline name="Imperial" style="Imperial Stout" abv={9.5} language="en" />);

    expect(screen.getByTestId("beer-headline")).toHaveStyle({ backgroundColor: theme.colors.dark.surface });
    expect(screen.getByText("Imperial")).toHaveStyle({ color: theme.colors.dark.foreground });
    expect(screen.getByTestId("beer-slab")).toBeOnTheScreen();
  });

  it.each(MODES)("writes the strength in the card's ink in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<BeerHeadline name="Pale" style="IPA" abv={5.2} language="fi" />);

    expect(screen.getByText("5,2", { exact: false })).toBeOnTheScreen();
  });
});
