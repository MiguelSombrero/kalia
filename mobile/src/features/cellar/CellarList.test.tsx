import { fireEvent, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { entryOf } from "@/testing/cellarEntries";
import { expectAccessibleStructure } from "@/testing/expectAccessibleStructure";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarList } from "./CellarList";

const entries = [
  entryOf({ id: "1", name: "Zeta Stout", brewery: "Kallio Barrel Works", style: "Imperial Stout", abv: 9, bestBefore: ["2030-01-01", "2030-01-01"] }),
  entryOf({ id: "2", name: "Pimeä Portteri", brewery: "Pohjanranta", style: "Baltic Porter", abv: 7.2, bestBefore: ["2027-05-01"] }),
  entryOf({ id: "3", name: "Hazy Hoax", brewery: "Kolmas Linja", style: "New England IPA", abv: 6.5, bestBefore: ["2026-01-01", undefined, undefined] }),
  entryOf({ id: "4", name: "Gone Beer", brewery: "Closed Brewery", style: "Mead", abv: 11, bestBefore: [undefined], withdrawn: true }),
];

const onAdd = jest.fn();
const onBrowse = jest.fn();
const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const renderList = (list = entries, locale: "en" | "fi" = "en") =>
  renderWithLocale(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CellarList entries={list} onAdd={onAdd} onBrowse={onBrowse} />
    </SafeAreaProvider>,
    locale,
  );
const rowNames = () => screen.getAllByRole("listitem").map((row) => String(row.props.accessibilityLabel).split(",")[0]);

afterEach(() => {
  jest.restoreAllMocks();
  onAdd.mockReset();
  onBrowse.mockReset();
});

describe("CellarList", () => {
  it.each([
    ["en", "Cellar", "4 beers · 7 bottles", "Find in my cellar", "Sort, Name"],
    ["fi", "Kellari", "4 olutta · 7 pulloa", "Etsi kellaristani", "Järjestä, Nimi"],
  ] as const)("finds every row, the totals and both controls by role and name in %s", async (locale, title, totals, find, sort) => {
    await renderList(entries, locale);

    expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("summary", { name: totals })).toBeOnTheScreen();
    expect(screen.getByRole("searchbox", { name: find })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: sort })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByLabelText(title)).toBeOnTheScreen();
    expectAccessibleStructure();
  });

  it("starts in name order and states the order on the sort button", async () => {
    await renderList();

    expect(rowNames()).toEqual(["Gone Beer", "Hazy Hoax", "Pimeä Portteri", "Zeta Stout"]);
  });

  it.each([
    ["Style", ["Pimeä Portteri", "Zeta Stout", "Gone Beer", "Hazy Hoax"]],
    ["Strength", ["Gone Beer", "Zeta Stout", "Pimeä Portteri", "Hazy Hoax"]],
    ["Bottles", ["Hazy Hoax", "Zeta Stout", "Gone Beer", "Pimeä Portteri"]],
    ["Best before", ["Hazy Hoax", "Pimeä Portteri", "Zeta Stout", "Gone Beer"]],
    ["Name", ["Gone Beer", "Hazy Hoax", "Pimeä Portteri", "Zeta Stout"]],
  ])("shows the beers in the %s order and says so on the button", async (label, expected) => {
    await renderList();

    await fireEvent.press(screen.getByRole("button", { name: "Sort, Name" }));
    await fireEvent.press(screen.getByRole("button", { name: label }));

    expect(rowNames()).toEqual(expected);
    expect(screen.getByRole("button", { name: `Sort, ${label}` })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Sort by")).not.toBeOnTheScreen();
  });

  it("opens the five orders as a menu that can be closed without choosing", async () => {
    await renderList();

    await fireEvent.press(screen.getByRole("button", { name: "Sort, Name" }));
    expect(screen.getByLabelText("Sort by")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: /^(Name|Style|Strength|Bottles|Best before)$/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Sort, Name", hidden: true })).toHaveProp("accessibilityState", { expanded: true });

    expect(screen.getByText("Close")).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Close sort menu" })).toHaveLength(1);
    expectAccessibleStructure();

    await fireEvent.press(screen.getByRole("button", { name: "Close sort menu" }));
    expect(screen.queryByLabelText("Sort by")).not.toBeOnTheScreen();
    expect(rowNames()[0]).toBe("Gone Beer");
  });

  it("closes the menu with a visible Close in Finnish, the only control that says so", async () => {
    await renderList(entries, "fi");

    await fireEvent.press(screen.getByRole("button", { name: "Järjestä, Nimi" }));

    expect(screen.getByText("Sulje")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Sulje järjestysvalikko" }));
    expect(screen.queryByLabelText("Järjestys")).not.toBeOnTheScreen();
  });

  it("narrows the rows by a beer's name, ignoring accents, and keeps the cellar's totals", async () => {
    await renderList();

    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find in my cellar" }), "pimea");

    expect(rowNames()).toEqual(["Pimeä Portteri"]);
    expect(screen.getByRole("summary", { name: "4 beers · 7 bottles" })).toBeOnTheScreen();
  });

  it("narrows the rows by a brewery's name", async () => {
    await renderList();

    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find in my cellar" }), "kallio");

    expect(rowNames()).toEqual(["Zeta Stout"]);
  });

  it("keeps the chosen order inside a find", async () => {
    await renderList();

    await fireEvent.press(screen.getByRole("button", { name: "Sort, Name" }));
    await fireEvent.press(screen.getByRole("button", { name: "Strength" }));
    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find in my cellar" }), "o");

    expect(rowNames()).toEqual(["Gone Beer", "Zeta Stout", "Pimeä Portteri", "Hazy Hoax"]);
  });

  it.each([
    ["en", "No beer in your cellar matches “zzz”.", "Your cellar is empty"],
    ["fi", "Kellarisi oluet eivät vastaa hakua ”zzz”.", "Kellarisi on tyhjä"],
  ] as const)("says nothing matches a find, apart from an empty cellar, and clears it in %s", async (locale, message, emptyTitle) => {
    await renderList(entries, locale);

    await fireEvent.changeText(screen.getByRole("searchbox"), "zzz");

    expect(screen.getByText(message)).toBeOnTheScreen();
    expect(screen.queryByText(emptyTitle)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: locale === "en" ? "Add a bottle" : "Lisää pullo" })).not.toBeOnTheScreen();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);

    await fireEvent.press(screen.getAllByRole("button", { name: locale === "en" ? "Clear find" : "Tyhjennä haku" })[1]!);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("marks a withdrawn beer's row and draws a style it does not know, rather than dropping either", async () => {
    await renderList();

    expect(screen.getByRole("listitem", { name: "Gone Beer, Closed Brewery, Mead, 11 %, 1 bottle, Withdrawn from the catalog" })).toBeOnTheScreen();
    expect(screen.getByText("Mead")).toBeOnTheScreen();
  });

  it.each([
    ["en", "Your cellar is empty", "Add a bottle", "Browse the catalog"],
    ["fi", "Kellarisi on tyhjä", "Lisää pullo", "Selaa oluita"],
  ] as const)("offers an empty cellar's two ways forward in %s, and no totals, find or sort", async (locale, title, add, browse) => {
    await renderList([], locale);

    expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: add }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: browse }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("summary")).not.toBeOnTheScreen();
    expect(screen.queryByRole("searchbox")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Sort/ })).not.toBeOnTheScreen();
    expectAccessibleStructure();
  });

  it.each(["en", "fi"] as const)("keeps every control and row, with no fixed height around text, at the largest text size in %s", async (locale) => {
    atLargestFontScale();
    await renderList(entries, locale);

    expect(screen.getByRole("searchbox")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: locale === "en" ? "Sort, Name" : "Järjestä, Nimi" })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0);
    expectScalesWithText();
    expectAccessibleStructure();
  });
});
