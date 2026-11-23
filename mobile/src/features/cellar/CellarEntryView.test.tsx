import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "@/lib/design/theme.generated";
import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { type BottleSpec, entryOf } from "@/testing/cellarEntries";
import { systemIs } from "@/testing/colorMode";
import { expectAccessibleStructure } from "@/testing/expectAccessibleStructure";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarEntryView } from "./CellarEntryView";

const TODAY = "2026-11-23";
const LONG_NAME = "Pohjoisen Pitkän Pimeän Kauden Kaakaokauraolut";
const LONG_BREWERY = "Itäisen Saaristomeren Käsityöpanimoyhtiö";
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

const onBack = jest.fn();
const onAdd = jest.fn();
const onSeeInCatalog = jest.fn();

const renderEntry = (entry: ReturnType<typeof entryOf>, locale: "en" | "fi" = "en") =>
  renderWithLocale(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CellarEntryView entry={entry} today={TODAY} onBack={onBack} onAdd={onAdd} onSeeInCatalog={onSeeInCatalog} />
    </SafeAreaProvider>,
    locale,
  );

const times = (count: number, spec: BottleSpec = {}) => Array.from({ length: count }, () => spec);
const twentyFour: BottleSpec[] = [
  ...times(6, { brewed: "2024-03-10", bestBefore: "2027-03-10" }),
  ...times(4, { brewed: "2023-02-14", bestBefore: "2026-02-14" }),
  { brewed: "2023-02-14", bestBefore: TODAY },
  ...times(3, { container: "CAN", brewed: "2025-09-01", bestBefore: "2028-09-01" }),
  ...times(2, { container: "CAN", brewed: "2022-11-05", bestBefore: "2026-05-05" }),
  ...times(2, { brewed: "2021-12-01" }),
  ...times(3),
  { container: "KEG", brewed: "2025-01-20", bestBefore: "2027-01-20" },
  ...times(2, { container: "CAN", bestBefore: "2027-08-01" }),
];
const bigEntry = () => entryOf({ id: "1", name: LONG_NAME, brewery: LONG_BREWERY, style: "Oatmeal Stout", abv: 9, bottles: twentyFour });
const rowNames = () => screen.getAllByTestId("bottle-row").map((row) => String(row.props.accessibilityLabel));

afterEach(() => {
  jest.restoreAllMocks();
  onBack.mockReset();
  onAdd.mockReset();
  onSeeInCatalog.mockReset();
});

describe("CellarEntryView", () => {
  it.each([
    ["en", "Back to the cellar", "Add a bottle", "See in the catalog", "Bottles of Hazy"],
    ["fi", "Takaisin kellariin", "Lisää pullo", "Näytä katalogissa", "Oluen Hazy pullot"],
  ] as const)("finds the way back, the beer, both actions and every bottle by role and name in %s", async (locale, back, add, see, list) => {
    await renderEntry(entryOf({ id: "1", name: "Hazy", bottles: [{ brewed: "2024-03-10", bestBefore: "2027-03-10" }, { container: "CAN", brewed: "2025-01-01" }] }), locale);

    expect(screen.getByRole("button", { name: back })).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Hazy" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: add })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: see })).toBeOnTheScreen();
    expect(screen.getByLabelText(list)).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expectAccessibleStructure();
  });

  it("goes back, adds and opens the catalog page from the three controls", async () => {
    await renderEntry(entryOf({ id: "1", name: "Hazy" }));

    await fireEvent.press(screen.getByRole("button", { name: "Back to the cellar" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add a bottle" }));
    await fireEvent.press(screen.getByRole("button", { name: "See in the catalog" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onSeeInCatalog).toHaveBeenCalledTimes(1);
  });

  it("labels the way back with the screen it returns to on iOS", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    await renderEntry(entryOf({ id: "1" }));

    expect(screen.getByText("Cellar")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back to the cellar" })).toBeOnTheScreen();
  });

  it("draws the way back as the arrow alone on Android, still named in words", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    await renderEntry(entryOf({ id: "1" }));

    expect(screen.queryByText("Cellar")).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back to the cellar" })).toBeOnTheScreen();
  });

  it("puts the oldest brew first and a bottle with no brewed date last", async () => {
    await renderEntry(
      entryOf({ id: "1", bottles: [{ container: "CAN" }, { brewed: "2025-09-01", bestBefore: "2028-09-01" }, { brewed: "2023-02-14", bestBefore: "2027-02-14" }] }),
    );

    expect(rowNames().map((name) => name.split(", ")[1])).toEqual(["Vintage 2023", "Vintage 2025", "Vintage unknown"]);
  });

  it("reads a bottle past its best-before date as past it in words and a tag, with no colour to tell it", async () => {
    await renderEntry(
      entryOf({ id: "1", bottles: [{ brewed: "2023-02-14", bestBefore: "2026-02-14" }, { brewed: "2024-03-10", bestBefore: "2027-03-10" }, { brewed: "2025-01-01", bestBefore: TODAY }] }),
    );

    expect(screen.getByRole("listitem", { name: "Bottle, Vintage 2023, Best before Feb 14, 2026, Past best before, Brewed Feb 14, 2023" })).toBeOnTheScreen();
    expect(screen.getAllByText("Past best before")).toHaveLength(1);
    expect(screen.getByRole("listitem", { name: "Bottle, Vintage 2024, Best before Mar 10, 2027, Brewed Mar 10, 2024" })).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: "Bottle, Vintage 2025, Best before Nov 23, 2026, Brewed Jan 1, 2025" })).toBeOnTheScreen();
    const tag = screen.getByTestId("past-best-before");
    expect(tag).toHaveStyle({ borderColor: theme.colors.light.foreground });
    expect(tag).not.toHaveStyle({ borderColor: theme.colors.light.destructive });
    expect(screen.queryByText(/spoil|bad|off/i)).not.toBeOnTheScreen();
  });

  it("says in words what a bottle with no dates lacks, never leaving a blank", async () => {
    await renderEntry(entryOf({ id: "1", bottles: [{}, { brewed: "2024-03-10" }, { bestBefore: "2027-03-10" }] }));

    expect(screen.getByRole("listitem", { name: "Bottle, Vintage unknown, Best before: not recorded, Brewed: not recorded" })).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: "Bottle, Vintage 2024, Best before: not recorded, Brewed Mar 10, 2024" })).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: "Bottle, Vintage unknown, Best before Mar 10, 2027, Brewed: not recorded" })).toBeOnTheScreen();
  });

  it("shows a withdrawn beer's bottles with its note and no way to the catalog or to add more", async () => {
    await renderEntry(entryOf({ id: "1", name: "Gone", withdrawn: true, bottles: [{ brewed: "2024-05-01", bestBefore: "2028-05-01" }, {}] }));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Withdrawn from the catalog")).toBeOnTheScreen();
    expect(screen.getByText("This beer was withdrawn from the catalog. You keep your bottles but can't add more.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "See in the catalog" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Add a bottle" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back to the cellar" })).toBeOnTheScreen();
    expectAccessibleStructure();
  });

  it.each([
    ["en", "Withdrawn from the catalog", "Tämä olut"],
    ["fi", "Poistettu katalogista", "Tämä olut on poistettu"],
  ] as const)("says a withdrawn beer is withdrawn in %s", async (locale, tag, note) => {
    await renderEntry(entryOf({ id: "1", withdrawn: true }), locale);

    expect(screen.getByText(tag)).toBeOnTheScreen();
    if (locale === "fi") expect(screen.getByText(new RegExp(`^${note}`))).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: locale === "en" ? "See in the catalog" : "Näytä katalogissa" })).not.toBeOnTheScreen();
  });

  it.each(["en", "fi"] as const)("reads twenty-four bottles, some with no dates, under a long Finnish beer name in full at the largest text size in %s", async (locale) => {
    atLargestFontScale();
    await renderEntry(bigEntry(), locale);

    expect(screen.getByRole("heading", { name: LONG_NAME })).toBeOnTheScreen();
    expect(screen.getByText(LONG_BREWERY)).toBeOnTheScreen();
    expect(screen.getAllByTestId("bottle-row")).toHaveLength(24);
    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    expect(screen.getAllByText(locale === "en" ? "Vintage unknown" : "Vuosikerta ei tiedossa")).toHaveLength(5 + 0);
    expect(screen.getAllByTestId("past-best-before")).toHaveLength(6);
    expect(screen.getByRole("button", { name: locale === "en" ? "Add a bottle" : "Lisää pullo" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: locale === "en" ? "See in the catalog" : "Näytä katalogissa" })).toBeOnTheScreen();
    expectScalesWithText();
    expectAccessibleStructure();
  });

  it("fills the head with the style group's colour in light", async () => {
    await renderEntry(entryOf({ id: "1", name: "Barrel", style: "Imperial Stout", abv: 12.5 }));

    expect(screen.getByTestId("cellar-entry-head")).toHaveStyle({ backgroundColor: theme.variants["beer-style"].stout.light.background });
    expect(screen.getByText("12.5 %")).toBeOnTheScreen();
  });

  it("sits the head on a neutral card with the style colour in a slab in dark", async () => {
    systemIs("dark");
    await renderEntry(entryOf({ id: "1", name: "Sour", style: "Gose" }));

    expect(screen.getByTestId("cellar-entry-head")).toHaveStyle({ backgroundColor: theme.colors.dark.surface });
    expect(screen.getByTestId("beer-slab")).toHaveStyle({ backgroundColor: theme.variants["beer-style"].sour.dark.background });
  });
});
