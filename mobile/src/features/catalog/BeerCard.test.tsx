import { screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { renderWithLocale } from "@/testing/renderWithLocale";
import type { BeerSummary } from "./api";
import { BeerCard } from "./BeerCard";

const beer = (style: string): BeerSummary => ({
  id: "1",
  name: "Test Beer",
  abv: 6.5,
  style,
  brewery: { id: "b1", name: "Test Brewery" },
});

describe("BeerCard", () => {
  it("fills the card with its style group's colour and writes the text in the colour paired with it", async () => {
    await renderWithLocale(<BeerCard beer={beer("Imperial Stout")} language="en" />);

    const { background, foreground } = theme.variants["beer-style"].stout.light;
    expect(screen.getByTestId("beer-row")).toHaveStyle({ backgroundColor: background });
    expect(screen.getByText("Test Beer")).toHaveStyle({ color: foreground });
  });

  it("falls back to the neutral colour for a style that belongs to no group, and stays readable", async () => {
    await renderWithLocale(<BeerCard beer={beer("Mead")} language="en" />);

    expect(screen.getByTestId("beer-row")).toHaveStyle({ backgroundColor: theme.colors.light.style });
    expect(screen.getByText("Test Beer")).toHaveStyle({ color: theme.colors.light["style-foreground"] });
    expect(screen.getByText("Mead")).toBeOnTheScreen();
  });

  it.each([
    ["en", "6.5 %"],
    ["fi", "6,5 %"],
  ])("writes the strength as %s does", async (language, strength) => {
    await renderWithLocale(<BeerCard beer={beer("IPA")} language={language} />);

    expect(screen.getByText(strength)).toBeOnTheScreen();
  });
});
