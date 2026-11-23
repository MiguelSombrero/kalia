import { screen } from "@testing-library/react-native";

import { contrastRatio } from "@/lib/design/contrast";
import { theme } from "@/lib/design/theme.generated";
import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { entryOf } from "@/testing/cellarEntries";
import { systemIs } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarRow } from "./CellarRow";

const LONG_NAME = "Pohjoisen Pitkän Pimeän Kauden Kaakaokauraolut";
const LONG_BREWERY = "Itäisen Saaristomeren Käsityöpanimoyhtiö";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CellarRow", () => {
  it("fills the row with its style group's colour and says the bottles held, with no best-before", async () => {
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", name: "Barrel", style: "Imperial Stout", abv: 12.5, bestBefore: ["2031-05-01", "2026-01-01", undefined] })} language="en" />);

    const { background, foreground } = theme.variants["beer-style"].stout.light;
    expect(screen.getByTestId("cellar-row")).toHaveStyle({ backgroundColor: background });
    expect(screen.getByText("Barrel")).toHaveStyle({ color: foreground });
    expect(screen.getByText("3 bottles")).toBeOnTheScreen();
    expect(screen.getByText("12.5 %")).toBeOnTheScreen();
    expect(screen.queryByText(/best/i)).not.toBeOnTheScreen();
  });

  it("is one list item named by the beer, its brewery, style, strength and bottles", async () => {
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", name: "Hazy", brewery: "Kolmas Linja", style: "IPA", abv: 6.5, bestBefore: [undefined, undefined] })} language="fi" />, "fi");

    expect(screen.getByRole("listitem", { name: "Hazy, Kolmas Linja, IPA, 6,5 %, 2 pulloa" })).toBeOnTheScreen();
  });

  it("marks a withdrawn beer's row, in both languages, and keeps its bottles", async () => {
    const entry = entryOf({ id: "1", name: "Gone", withdrawn: true, bestBefore: [undefined] });
    await renderWithLocale(<CellarRow entry={entry} language="en" />);

    expect(screen.getByText("Withdrawn from the catalog")).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: /Gone.*1 bottle, Withdrawn from the catalog$/ })).toBeOnTheScreen();
    expect(screen.getByText("1 bottle")).toBeOnTheScreen();
  });

  it("does not mark a beer that is still in the catalog", async () => {
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1" })} language="en" />);

    expect(screen.queryByText("Withdrawn from the catalog")).not.toBeOnTheScreen();
  });

  it("draws a style the app does not know in the neutral colour, readable, rather than dropping it", async () => {
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", name: "Odd", style: "Lichtenhainer from a later release" })} language="en" />);

    expect(screen.getByTestId("cellar-row")).toHaveStyle({ backgroundColor: theme.colors.light.style });
    expect(screen.getByText("Odd")).toHaveStyle({ color: theme.colors.light["style-foreground"] });
    expect(screen.getByText("Lichtenhainer from a later release")).toBeOnTheScreen();
  });

  it("reads a long Finnish beer and brewery name in full at the largest text size, with nothing cut or fixed", async () => {
    atLargestFontScale();
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", name: LONG_NAME, brewery: LONG_BREWERY, style: "Oatmeal Stout", abv: 9, bestBefore: [undefined, undefined] })} language="fi" />, "fi");

    expect(screen.getByText(LONG_NAME)).toBeOnTheScreen();
    expect(screen.getByText(LONG_BREWERY)).toBeOnTheScreen();
    expect(screen.getByText("2 pulloa")).toBeOnTheScreen();
    expectScalesWithText();
  });

  it.each([
    ["en", "6.5 %"],
    ["fi", "6,5 %"],
  ])("writes the strength as %s does", async (language, strength) => {
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", abv: 6.5 })} language={language} />);

    expect(screen.getByText(strength)).toBeOnTheScreen();
  });
});

describe("CellarRow in dark", () => {
  it("sits on a neutral card with the style colour in its slab and ordinary text on the card", async () => {
    systemIs("dark");
    await renderWithLocale(<CellarRow entry={entryOf({ id: "1", name: "Sour", style: "Gose" })} language="en" />);

    const { surface, foreground } = theme.colors.dark;
    expect(screen.getByTestId("cellar-row")).toHaveStyle({ backgroundColor: surface });
    expect(screen.getByTestId("beer-slab")).toHaveStyle({ backgroundColor: theme.variants["beer-style"].sour.dark.background });
    expect(screen.getByText("Sour")).toHaveStyle({ color: foreground });
    expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(4.5);
  });
});
