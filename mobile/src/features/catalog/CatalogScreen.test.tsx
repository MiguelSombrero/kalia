import { apiError, registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { contrastRatio } from "@/lib/design/contrast";
import { theme } from "@/lib/design/theme.generated";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CatalogScreen } from "./CatalogScreen";
import { emptyFilters } from "./filters/model";
import { useFiltersStore } from "./filters/store";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const transport = jest.fn();

const beer = (id: string, name: string, abv: number) => ({
  id,
  name,
  abv,
  style: "IPA",
  brewery: { id: `brewery-${id}`, name: `Brewery ${id}`, countryCode: "FI" },
});
const pageOf = (content: ReturnType<typeof beer>[]) => ({
  data: { content, page: 0, totalElements: content.length, totalPages: 1 },
  status: 200,
  headers: new Headers(),
});

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  mockPush.mockReset();
  useFiltersStore.getState().reset();
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

describe("CatalogScreen's loading, error and empty blocks", () => {
  it.each(["light", "dark"] as const)("says it is loading, quietly, with placeholders, when the system is %s", async (mode) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
    transport.mockReturnValue(new Promise(() => undefined));

    await renderWithLocale(<CatalogScreen />, "fi");

    expect(screen.getByText("Ladataan oluita…")).toHaveStyle({ color: theme.colors[mode]["muted-foreground"] });
    expect(screen.getByTestId("loading-placeholders").children).toHaveLength(3);
  });

  it.each(["light", "dark"] as const)("says what failed, names the request and offers a retry when the system is %s", async (mode) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
    transport.mockRejectedValue(apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" }));

    await renderWithLocale(<CatalogScreen />, "fi");

    expect(await screen.findByText("Oluiden lataus ei onnistunut.")).toHaveStyle({ color: theme.colors[mode].destructive });
    expect(screen.getByText("Viite: 0af7651916cd43dd8448eb211c80319c")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeOnTheScreen();
  });

  it.each(["light", "dark"] as const)("says the catalog is empty, quietly, when the system is %s", async (mode) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
    transport.mockResolvedValue(pageOf([]));

    await renderWithLocale(<CatalogScreen />, "fi");

    expect(await screen.findByText("Oluita ei ole vielä lisätty.")).toHaveStyle({ color: theme.colors[mode]["muted-foreground"] });
  });
});

describe("CatalogScreen", () => {
  it.each([
    ["en", "Catalog", "5.2 %"],
    ["fi", "Oluet", "5,2 %"],
  ] as const)("lists each beer's name, brewery, style and strength in %s", async (locale, heading, abv) => {
    transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2), beer("2", "Stout", 7)]));

    await renderWithLocale(<CatalogScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    expect(screen.getAllByText("Brewery 1")).toHaveLength(1);
    expect(screen.getAllByText("IPA")).toHaveLength(2);
    expect(screen.getByText(abv)).toBeOnTheScreen();
    expect(screen.getByText("Stout")).toBeOnTheScreen();
  });

  it.each(["light", "dark"] as const)("is readable when the system is %s", async (mode) => {
    jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
    const colors = theme.colors[mode];
    transport.mockResolvedValue(pageOf([{ ...beer("1", "Pale Ale", 5.2), style: "Gose" }, { ...beer("2", "Stout", 7), style: "Imperial Stout" }]));

    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");

    expect(screen.getByRole("heading", { name: "Catalog" })).toHaveStyle({ color: colors.foreground });
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
    const [gose, stout] = screen.getAllByTestId("beer-row");
    const sour = theme.variants["beer-style"].sour[mode];
    const stoutPair = theme.variants["beer-style"].stout[mode];
    if (mode === "dark") {
      expect(gose).toHaveStyle({ backgroundColor: colors.surface });
      expect(stout).toHaveStyle({ backgroundColor: colors.surface });
      expect(screen.getAllByTestId("beer-slab")).toHaveLength(2);
      expect(screen.getByText("Pale Ale")).toHaveStyle({ color: colors.foreground });
      expect(contrastRatio(colors.foreground, colors.surface)).toBeGreaterThanOrEqual(4.5);
    } else {
      expect(gose).toHaveStyle({ backgroundColor: sour.background });
      expect(stout).toHaveStyle({ backgroundColor: stoutPair.background });
      expect(screen.getByText("Pale Ale")).toHaveStyle({ color: sour.foreground });
      expect(contrastRatio(sour.foreground, sour.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("lets the list grow with the system text size", async () => {
    transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2)]));

    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");

    expectScalesWithText();
  });

  it("marks each beer's row with a test id, so a flow can find rows without naming a beer", async () => {
    transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2), beer("2", "Stout", 7)]));

    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");

    expect(screen.getAllByTestId("beer-row")).toHaveLength(2);
  });

  it.each([
    ["en", "Reference: 0af7651916cd43dd8448eb211c80319c"],
    ["fi", "Viite: 0af7651916cd43dd8448eb211c80319c"],
  ] as const)("names the failed request's trace id, in %s", async (locale, reference) => {
    transport.mockRejectedValue(apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" }));

    await renderWithLocale(<CatalogScreen />, locale);

    expect(await screen.findByText(reference)).toBeOnTheScreen();
  });

  it("asks for the first page only, with an explicit size", async () => {
    transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5)]));

    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");

    expect(transport).toHaveBeenCalledTimes(1);
    const url = String(transport.mock.calls[0]?.[0]);
    expect(url).toContain("/api/v1/beers");
    expect(url).toMatch(/page=0/);
    expect(url).toMatch(/size=\d+/);
  });

  it.each([
    ["en", "Loading beers…"],
    ["fi", "Ladataan oluita…"],
  ] as const)("says it is loading while the first page is on its way, in %s", async (locale, loading) => {
    let answer: (page: ReturnType<typeof pageOf>) => void = () => undefined;
    transport.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    await renderWithLocale(<CatalogScreen />, locale);

    expect(screen.getByText(loading)).toBeOnTheScreen();
    await act(async () => answer(pageOf([])));
    await waitFor(() => expect(screen.queryByText(loading)).not.toBeOnTheScreen());
  });

  it.each([
    ["en", "No beers have been added yet."],
    ["fi", "Oluita ei ole vielä lisätty."],
  ] as const)("says the catalog is empty when there are no beers, in %s", async (locale, empty) => {
    transport.mockResolvedValue(pageOf([]));

    await renderWithLocale(<CatalogScreen />, locale);

    expect(await screen.findByText(empty)).toBeOnTheScreen();
  });

  it.each([
    ["en", "Couldn't load beers.", "Try again"],
    ["fi", "Oluiden lataus ei onnistunut.", "Yritä uudelleen"],
  ] as const)("offers a retry that asks the client again when the read fails, in %s", async (locale, failed, retry) => {
    transport.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));
    transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5)]));

    await renderWithLocale(<CatalogScreen />, locale);
    expect(await screen.findByText(failed)).toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: retry }));

    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(failed)).not.toBeOnTheScreen();
  });

  it("treats a non-200 answer as a failed read", async () => {
    transport.mockResolvedValue({ data: { title: "Unexpected" }, status: 500, headers: new Headers() });

    await renderWithLocale(<CatalogScreen />);

    expect(await screen.findByText("Couldn't load beers.")).toBeOnTheScreen();
  });

  describe("search and filters", () => {
    it.each([
      ["en", "Search beers", "Filters"],
      ["fi", "Hae oluita", "Suodattimet"],
    ] as const)("offers a search field and a Filters button by name, in %s", async (locale, search, filters) => {
      transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2)]));

      await renderWithLocale(<CatalogScreen />, locale);

      expect(screen.getByRole("searchbox", { name: search })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: filters })).toBeOnTheScreen();
      await screen.findByText("Pale Ale");
    });

    it("keeps what is typed in the search field and offers to clear it", async () => {
      transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2)]));
      await renderWithLocale(<CatalogScreen />);

      await fireEvent.changeText(screen.getByRole("searchbox", { name: "Search beers" }), "ipa");
      expect(screen.getByRole("searchbox", { name: "Search beers" })).toHaveDisplayValue("ipa");

      await fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
      expect(screen.getByRole("searchbox", { name: "Search beers" })).toHaveDisplayValue("");
      await screen.findByText("Pale Ale");
    });

    it("opens the filter sheet from the Filters button", async () => {
      transport.mockResolvedValue(pageOf([]));
      await renderWithLocale(<CatalogScreen />);

      await fireEvent.press(screen.getByRole("button", { name: "Filters" }));

      expect(mockPush).toHaveBeenCalledWith("/filters-sheet");
      await screen.findByText("No beers have been added yet.");
    });

    it("shows the filters in force as chips and a count, and removes one at a time", async () => {
      transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2)]));
      useFiltersStore.getState().apply({ ...emptyFilters(), style: "IPA", countryCode: "FI", min: "5", sort: "abv,desc" });
      await renderWithLocale(<CatalogScreen />);

      expect(screen.getByRole("button", { name: "Filters, 4 in force" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Remove filter: IPA" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Remove filter: Finland" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Remove filter: at least 5 %" })).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole("button", { name: "Remove filter: IPA" }));
      expect(await screen.findByRole("button", { name: "Filters, 3 in force" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Remove filter: IPA" })).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));
      expect(await screen.findByRole("button", { name: "Filters" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: /^Remove filter/ })).not.toBeOnTheScreen();
    });

    it("lets the controls and chips grow with the system text size", async () => {
      transport.mockResolvedValue(pageOf([beer("1", "Pale Ale", 5.2)]));
      useFiltersStore.getState().apply({ ...emptyFilters(), style: "IPA" });
      await renderWithLocale(<CatalogScreen />);
      await screen.findByText("Pale Ale");

      expectScalesWithText();
    });
  });
});
