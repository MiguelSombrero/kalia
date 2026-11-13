import { screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { BeerSlot } from "./BeerSlot";

afterEach(() => jest.restoreAllMocks());

describe("BeerSlot", () => {
  it.each(MODES)("colours itself by the beer's style in %s, at the left edge, rounded with the card", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<BeerSlot beerStyle="Gose" />);

    expect(screen.getByTestId("beer-slab")).toHaveStyle({
      backgroundColor: theme.variants["beer-style"].sour[mode].background,
      borderTopLeftRadius: theme.radius.card,
      borderBottomLeftRadius: theme.radius.card,
    });
  });

  it("outlines itself only where the dark surface would swallow its colour", async () => {
    systemIs("dark");
    await renderWithLocale(<BeerSlot beerStyle="Imperial Stout" />);

    expect(screen.getByTestId("beer-slab")).toHaveStyle({ borderWidth: 1.5, borderColor: theme.colors.dark.border });
  });

  it("takes the neutral colour for a style that belongs to no group", async () => {
    systemIs("light");
    await renderWithLocale(<BeerSlot beerStyle="Mead" />);

    expect(screen.getByTestId("beer-slab")).toHaveStyle({ backgroundColor: theme.colors.light.style });
  });
});
