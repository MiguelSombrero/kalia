import { screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { contrastRatio } from "@/lib/design/contrast";
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
  status: "APPROVED",
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

describe("BeerCard in dark", () => {
  beforeEach(() => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sits on a neutral card with the style colour only in its slab, and writes ordinary text on the card", async () => {
    await renderWithLocale(<BeerCard beer={beer("Gose")} language="en" />);

    const { surface, foreground } = theme.colors.dark;
    expect(screen.getByTestId("beer-row")).toHaveStyle({ backgroundColor: surface });
    expect(screen.getByTestId("beer-slab")).toHaveStyle({ backgroundColor: theme.variants["beer-style"].sour.dark.background });
    expect(screen.getByTestId("beer-slab")).toHaveStyle({ borderTopLeftRadius: theme.radius.card, borderBottomLeftRadius: theme.radius.card });
    expect(screen.getByText("Test Beer")).toHaveStyle({ color: foreground });
    expect(screen.getByText("Test Brewery")).toHaveStyle({ color: theme.colors.dark["muted-foreground"] });
    expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.colors.dark["muted-foreground"], surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ["Imperial Stout", true],
    ["Gose", false],
  ])("outlines a slab that cannot stand off the card and only that one: %s", async (style, outlined) => {
    await renderWithLocale(<BeerCard beer={beer(style)} language="en" />);

    const slab = screen.getByTestId("beer-slab");
    if (outlined) expect(slab).toHaveStyle({ borderWidth: 1.5, borderColor: theme.colors.dark.border });
    else expect(slab).not.toHaveStyle({ borderWidth: 1.5 });
  });

  it("takes the neutral colour for a style that belongs to no group", async () => {
    await renderWithLocale(<BeerCard beer={beer("Mead")} language="en" />);

    expect(screen.getByTestId("beer-slab")).toHaveStyle({ backgroundColor: theme.colors.dark.style });
  });
});

describe("BeerCard in light", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("has no slab", async () => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");
    await renderWithLocale(<BeerCard beer={beer("Gose")} language="en" />);

    expect(screen.queryByTestId("beer-slab")).not.toBeOnTheScreen();
  });
});
