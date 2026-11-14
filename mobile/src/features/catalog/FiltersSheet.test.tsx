import { registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { BackHandler } from "react-native";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { FiltersSheet } from "./FiltersSheet";
import { emptyFilters, type Filters } from "./filters/model";

const transport = jest.fn();
const answer = (data: unknown) => ({ data, status: 200, headers: new Headers() });
const brewery = (id: string, name: string, countryCode = "FI", city?: string) => ({ id, name, countryCode, ...(city ? { city } : {}) });
const LONG_BREWERY = "Santalahden ja Onkiniemen Osake-Oluttehdas";
const LONG_STYLE = "Belgian Strong Golden Ale";

const serve = (breweries = [brewery("b1", "Maku Brewing", "FI", "Tuusula"), brewery("b2", "Mikkeller", "DK")]) =>
  transport.mockImplementation(async (url: string) => {
    if (url.includes("/api/v1/styles")) return answer(["Gose", "IPA", "Imperial Stout", LONG_STYLE]);
    if (url.includes("/api/v1/breweries/countries")) return answer(["AL", "CZ", "FI"]);
    if (url.includes("/api/v1/breweries")) return answer({ content: breweries, page: 0, totalElements: breweries.length, totalPages: 1 });
    return answer({ content: [], page: 0, totalElements: 12, totalPages: 12 });
  });

const choiceRows = () => screen.getAllByRole("button").filter((row) => row.props.accessibilityState?.selected !== undefined);
const set = (patch: Partial<Filters> = {}): Filters => ({ ...emptyFilters(), ...patch });
const renderSheet = async (initial = set(), locale: "en" | "fi" = "en") => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  await renderWithLocale(<FiltersSheet initial={initial} onApply={onApply} onClose={onClose} />, locale);
  await screen.findByRole("button", { name: /^(Show|Näytä) / });
  return { onApply, onClose };
};

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
  serve();
});
afterEach(() => jest.restoreAllMocks());

describe("FiltersSheet", () => {
  it.each([
    ["en", "Filters", "Close"],
    ["fi", "Suodattimet", "Sulje"],
  ] as const)("is the one sheet shell, with its heading and close action found by role and name, in %s", async (locale, title, close) => {
    await renderSheet(set(), locale);

    expect(screen.getByTestId("sheet")).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: close })).toBeOnTheScreen();
  });

  it("offers every control by role and name, with the count the apply button will show", async () => {
    await renderSheet(set({ style: "IPA", breweryId: "b1", breweryName: "Maku Brewing", countryCode: "FI", min: "4", max: "7", sort: "abv,desc" }));

    expect(screen.getByRole("heading", { name: "Filters" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Style: IPA" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Brewery: Maku Brewing" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Country: Finland" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Strength %")).toBeOnTheScreen();
    expect(screen.getByLabelText("Strength %: From")).toHaveDisplayValue("4");
    expect(screen.getByLabelText("Strength %: To")).toHaveDisplayValue("7");
    expect(screen.getByLabelText("Sort by")).toBeOnTheScreen();
    expect(await screen.findByRole("button", { name: "Show 12 beers" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Strength (high → low)", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show 12 beers" })).toBeOnTheScreen();
  });

  it("closes without applying", async () => {
    const { onApply, onClose } = await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();
  });

  it("reports the chosen values once, and only when the button is pressed", async () => {
    const { onApply } = await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Style: Any style" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Imperial Stout" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Brewery: Any brewery" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Maku Brewing, Tuusula · Finland" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Country: All countries" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Czechia" }));
    await screen.findByRole("button", { name: "Country: Czechia" });
    await fireEvent.changeText(screen.getByLabelText("Strength %: From"), "6,5");
    await fireEvent.changeText(screen.getByLabelText("Strength %: To"), "9");
    await fireEvent.press(screen.getByRole("button", { name: "Name (Z–A)" }));
    await screen.findByRole("button", { name: "Name (Z–A)", selected: true });
    expect(onApply).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: /^Show / }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(set({ style: "Imperial Stout", breweryId: "b1", breweryName: "Maku Brewing", countryCode: "CZ", min: "6,5", max: "9", sort: "name,desc" }));
  });

  it("empties every choice with Clear all, keeping the search text", async () => {
    const { onApply } = await renderSheet(set({ query: "ipa", style: "IPA", countryCode: "FI", min: "4", sort: "abv,asc" }));

    await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));

    expect(await screen.findByRole("button", { name: "Style: Any style" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Country: All countries" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /^Show / }));
    expect(onApply).toHaveBeenCalledWith(set({ query: "ipa" }));
  });

  it("refuses a strength from above to, says so, and does not apply", async () => {
    const { onApply } = await renderSheet();

    await fireEvent.changeText(screen.getByLabelText("Strength %: From"), "9");
    await fireEvent.changeText(screen.getByLabelText("Strength %: To"), "5");

    expect(await screen.findByRole("alert")).toHaveTextContent("From must not be above to.");
    const apply = screen.getByRole("button", { name: /^Show / });
    expect(apply).toBeDisabled();
    await fireEvent.press(apply);
    expect(onApply).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Strength %: To"), "11");
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeOnTheScreen());
  });

  it("refuses a strength outside zero to the API's maximum", async () => {
    await renderSheet();

    await fireEvent.changeText(screen.getByLabelText("Strength %: To"), "101");

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a strength from 0 to 100.");
  });

  it("asks for the count once the choices stop changing, not on every keystroke", async () => {
    await renderSheet();
    const countCalls = () => transport.mock.calls.filter(([url]) => String(url).includes("/api/v1/beers")).length;
    const before = countCalls();

    for (const text of ["4", "4,", "4,5"]) await fireEvent.changeText(screen.getByLabelText("Strength %: From"), text);
    expect(countCalls()).toBe(before);
    await waitFor(() => expect(countCalls()).toBe(before + 1));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 450)));

    expect(countCalls()).toBe(before + 1);
    expect(String(transport.mock.calls.at(-1)?.[0])).toContain("minAbv=4.5");
  });

  it.each([
    ["en", "Czechia", "Albania"],
    ["fi", "Tšekki", "Albania"],
  ] as const)("names the countries in %s, in that language's order", async (locale, czechia, albania) => {
    await renderSheet(set(), locale);

    await fireEvent.press(screen.getByRole("button", { name: /^(Country|Maa): / }));
    await screen.findByRole("searchbox");

    expect(await screen.findByRole("button", { name: czechia })).toBeOnTheScreen();
    const names = choiceRows().map((row) => String(row.props.accessibilityLabel));
    expect(names.slice(1)).toEqual([...names.slice(1)].sort((a, b) => a.localeCompare(b, locale)));
    expect(names).toContain(albania);
  });

  it("steps back from a picker to the form on the system Back button, and does not take it from the form", async () => {
    let pressBack: (() => unknown) | undefined;
    const subscribe = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
      pressBack = () => handler({} as never);
      return { remove: () => (pressBack = undefined) };
    });
    await renderSheet();
    expect(pressBack).toBeUndefined();

    await fireEvent.press(screen.getByRole("button", { name: "Style: Any style" }));
    await screen.findByRole("searchbox", { name: "Find a style" });
    expect(subscribe).toHaveBeenCalled();
    await act(async () => expect(pressBack?.()).toBe(true));

    expect(await screen.findByRole("button", { name: "Style: Any style" })).toBeOnTheScreen();
    await waitFor(() => expect(pressBack).toBeUndefined());
  });

  it.each([
    ["en", /^Style: /, "Style"],
    ["en", /^Brewery: /, "Brewery"],
    ["en", /^Country: /, "Country"],
    ["fi", /^Tyyli: /, "Tyyli"],
  ] as const)("puts the screen reader on the %s picker's heading when it opens, not on a row", async (locale, field, title) => {
    const focus = jest.mocked(ReactNative.AccessibilityInfo.sendAccessibilityEvent);
    focus.mockClear();
    await renderSheet(set(), locale);
    expect(focus).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole("button", { name: field }));
    await screen.findByRole("searchbox");

    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
    const [target, event] = focus.mock.calls[0] as unknown as [{ props: Record<string, unknown> }, string];
    expect(event).toBe("focus");
    expect(target.props).toMatchObject({ role: "heading", children: title });
  });

  it.each([
    ["ios", "en", /^Style: /, ["Any style", "Gose", "IPA", "Imperial Stout", LONG_STYLE]],
    ["ios", "fi", /^Tyyli: /, ["Kaikki tyylit", "Gose", "IPA", "Imperial Stout", LONG_STYLE]],
    ["android", "en", /^Style: /, ["Any style", "Gose", "IPA", "Imperial Stout", LONG_STYLE]],
    ["android", "fi", /^Tyyli: /, ["Kaikki tyylit", "Gose", "IPA", "Imperial Stout", LONG_STYLE]],
  ] as const)("on %s in %s, gives a picker's rows their option name and a chosen state, with no state word of React Native's own", async (platform, locale, field, names) => {
    jest.replaceProperty(ReactNative.Platform, "OS", platform);
    await renderSheet(set({ style: "IPA" }), locale);

    await fireEvent.press(screen.getByRole("button", { name: field }));
    await screen.findByRole("searchbox");
    await screen.findByText("Gose");

    const rows = platform === "ios" ? choiceRows() : screen.getAllByRole("radio");
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual(names);
    const chosen = rows.map((row) => row.props.accessibilityState);
    if (platform === "ios") {
      expect(rows.map((row) => row.props.role)).toEqual(names.map(() => "button"));
      expect(chosen).toEqual([{ selected: false }, { selected: false }, { selected: true }, { selected: false }, { selected: false }]);
    } else {
      expect(rows.map((row) => row.props.role)).toEqual(names.map(() => "radio"));
      expect(chosen).toEqual([{ checked: false }, { checked: false }, { checked: true }, { checked: false }, { checked: false }]);
    }
  });

  it("narrows the styles by what is typed, ignoring case and accents", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Style: Any style" }));
    await screen.findByRole("button", { name: "Gose" });
    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find a style" }), "IMPÉRIAL");

    expect(await screen.findByRole("button", { name: "Imperial Stout" })).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Gose" })).not.toBeOnTheScreen());
  });

  it("searches breweries on the server and goes back to the form with the pick", async () => {
    await renderSheet();

    await fireEvent.press(screen.getByRole("button", { name: "Brewery: Any brewery" }));
    await fireEvent.changeText(await screen.findByRole("searchbox", { name: "Search breweries" }), "mik");

    await waitFor(() => expect(transport.mock.calls.some(([url]) => String(url).includes("query=mik"))).toBe(true));
    await fireEvent.press(screen.getByRole("button", { name: "Back to filters" }));
    expect(await screen.findByRole("button", { name: "Brewery: Any brewery" })).toBeOnTheScreen();
  });

  it("reads a long Finnish brewery and style in full at the largest font scale", async () => {
    jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 3.1 });
    jest.spyOn(ReactNative.PixelRatio, "getFontScale").mockReturnValue(3.12);

    await renderSheet(set({ style: LONG_STYLE, breweryId: "b9", breweryName: LONG_BREWERY, countryCode: "GB", min: "4,5", sort: "style,asc" }), "fi");

    expect(screen.getByText(LONG_STYLE)).toBeOnTheScreen();
    expect(screen.getByText(LONG_BREWERY)).toBeOnTheScreen();
    expect(screen.getByText("Iso-Britannia")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tyyli (A–Ö)", selected: true })).toBeOnTheScreen();
    expectScalesWithText();
  });
});
