import { apiError, registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { useState } from "react";
import { Keyboard } from "react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CatalogScreen } from "./CatalogScreen";
import { emptyFilters } from "./filters/model";
import { useFiltersStore } from "./filters/store";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));

const transport = jest.fn();

const beer = (name: string, status: "APPROVED" | "PENDING" | "IN_REVIEW" = "APPROVED") => ({
  id: `id-${name}`,
  name,
  abv: 5,
  style: "IPA",
  status,
  brewery: { id: "brewery-1", name: "Brewery", countryCode: "FI" },
});
const pageOf = (names: string[], page = 0, totalPages = 1) => ({
  data: { content: names.map((name) => beer(name)), page, totalElements: names.length * totalPages, totalPages },
  status: 200,
  headers: new Headers(),
});
const searchOf = (call: unknown[]) => new URL(String(call[0]), "http://api.test").searchParams;
const requests = () => transport.mock.calls.map(searchOf);
const settle = (ms = 450) => act(async () => void (await new Promise((resolve) => setTimeout(resolve, ms))));
const list = () => screen.getByTestId("beer-list");

beforeEach(() => {
  mockPush.mockReset();
  useFiltersStore.getState().reset();
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("searching as the user types", () => {
  it("sends one request after the pause and not one per keystroke", async () => {
    transport.mockResolvedValue(pageOf(["Pale Ale"]));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");
    const field = screen.getByRole("searchbox", { name: "Search beers" });

    await fireEvent.changeText(field, "ip");
    await fireEvent.changeText(field, "ipa");
    await fireEvent.changeText(field, "ipa ");
    expect(transport).toHaveBeenCalledTimes(1);
    await settle();

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(requests()[1]?.get("query")).toBe("ipa");
    expect(requests()[1]?.get("page")).toBe("0");
  });

  it("shows the unfiltered list for a query of fewer than two characters", async () => {
    transport.mockResolvedValue(pageOf(["Pale Ale"]));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");

    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Search beers" }), "i");
    await settle();

    expect(transport).toHaveBeenCalledTimes(1);
    expect(requests()[0]?.has("query")).toBe(false);
  });

  it("lets a newer query replace an older answer that arrives late", async () => {
    const answers: Record<string, (page: ReturnType<typeof pageOf>) => void> = {};
    transport.mockImplementation((url: string) => {
      const query = new URL(url, "http://api.test").searchParams.get("query") ?? "";
      return new Promise((resolve) => (answers[query] = resolve));
    });
    await renderWithLocale(<CatalogScreen />);
    await act(async () => answers[""]?.(pageOf(["Everything"])));
    await screen.findByText("Everything");
    const field = screen.getByRole("searchbox", { name: "Search beers" });

    await fireEvent.changeText(field, "ab");
    await settle();
    await fireEvent.changeText(field, "abc");
    await settle();
    await act(async () => answers["abc"]?.(pageOf(["Newer answer"])));
    await act(async () => answers["ab"]?.(pageOf(["Older answer"])));

    expect(await screen.findByText("Newer answer")).toBeOnTheScreen();
    expect(screen.queryByText("Older answer")).not.toBeOnTheScreen();
  });

  it("runs the search at once on the keyboard's search key and dismisses the keyboard", async () => {
    transport.mockResolvedValue(pageOf(["Pale Ale"]));
    const dismiss = jest.spyOn(Keyboard, "dismiss");
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Pale Ale");
    const field = screen.getByRole("searchbox", { name: "Search beers" });

    await fireEvent.changeText(field, "stout");
    await fireEvent(field, "submitEditing");

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(requests()[1]?.get("query")).toBe("stout");
    expect(dismiss).toHaveBeenCalled();
  });

  it("clears the search field and the query together", async () => {
    transport.mockImplementation(async (url: string) => (new URL(url, "http://api.test").searchParams.has("query") ? pageOf(["Filtered"]) : pageOf(["Everything"])));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Everything");
    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Search beers" }), "ipa");
    await settle();
    await screen.findByText("Filtered");

    await fireEvent.press(screen.getByRole("button", { name: "Clear search" }));
    await settle();

    expect(await screen.findByText("Everything")).toBeOnTheScreen();
    expect(screen.getByRole("searchbox", { name: "Search beers" })).toHaveDisplayValue("");
    expect(useFiltersStore.getState().applied.query).toBe("");
  });
});

describe("a list of pages", () => {
  it("loads the next page at the end of the list and stops when the list is exhausted", async () => {
    transport.mockResolvedValueOnce(pageOf(["Alpha"], 0, 2)).mockResolvedValueOnce(pageOf(["Beta"], 1, 2));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");

    await fireEvent(list(), "endReached");

    expect(await screen.findByText("Beta")).toBeOnTheScreen();
    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(requests().map((search) => search.get("page"))).toEqual(["0", "1"]);
    await fireEvent(list(), "endReached");
    await settle(100);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Loading more|Ladataan lisää/)).not.toBeOnTheScreen();
  });

  it("keeps the loaded pages when a later page fails, offers a retry at the foot and continues from there", async () => {
    transport.mockResolvedValueOnce(pageOf(["Alpha"], 0, 3)).mockRejectedValueOnce(apiError("network", "Could not reach the backend")).mockResolvedValueOnce(pageOf(["Beta"], 1, 3));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");

    await fireEvent(list(), "endReached");

    expect(await screen.findByText("Couldn't load more beers.")).toBeOnTheScreen();
    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load beers.")).not.toBeOnTheScreen();
    await fireEvent(list(), "endReached");
    expect(transport).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Beta")).toBeOnTheScreen();
    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(requests().map((search) => search.get("page"))).toEqual(["0", "1", "1"]);
    expect(screen.queryByText("Couldn't load more beers.")).not.toBeOnTheScreen();
  });

  it("reloads only the first page on a pull to refresh", async () => {
    transport.mockResolvedValueOnce(pageOf(["Alpha"], 0, 2)).mockResolvedValueOnce(pageOf(["Beta"], 1, 2)).mockResolvedValueOnce(pageOf(["Alpha again"], 0, 2));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");
    await fireEvent(list(), "endReached");
    await screen.findByText("Beta");

    await act(async () => list().props.refreshControl.props.onRefresh());

    expect(await screen.findByText("Alpha again")).toBeOnTheScreen();
    expect(requests().map((search) => search.get("page"))).toEqual(["0", "1", "0"]);
    expect(screen.queryByText("Beta")).not.toBeOnTheScreen();
  });

  it("keeps every loaded page when a pull to refresh fails", async () => {
    transport.mockResolvedValueOnce(pageOf(["Alpha"], 0, 2)).mockResolvedValueOnce(pageOf(["Beta"], 1, 2)).mockRejectedValueOnce(apiError("network", "Could not reach the backend"));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");
    await fireEvent(list(), "endReached");
    await screen.findByText("Beta");

    await act(async () => list().props.refreshControl.props.onRefresh());

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(3));
    expect(screen.getByText("Alpha")).toBeOnTheScreen();
    expect(await screen.findByText("Beta")).toBeOnTheScreen();
  });

  it("opens a beer's page from its row", async () => {
    transport.mockResolvedValue(pageOf(["Alpha"]));
    await renderWithLocale(<CatalogScreen />);

    await fireEvent.press(await screen.findByRole("button", { name: /^Alpha, Brewery, IPA, 5 %/ }));

    expect(mockPush).toHaveBeenCalledWith("/beers/id-Alpha");
  });
});

describe("filters in the request", () => {
  it("narrows the request with each filter and restores it when the filter is cleared", async () => {
    transport.mockResolvedValue(pageOf(["Alpha"]));
    useFiltersStore.getState().apply({ ...emptyFilters(), style: "IPA", breweryId: "brewery-1", breweryName: "Brewery", countryCode: "FI", min: "4", max: "6", sort: "abv,desc" });
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");

    const filtered = requests()[0];
    expect(Object.fromEntries(filtered?.entries() ?? [])).toEqual({ style: "IPA", breweryId: "brewery-1", countryCode: "FI", minAbv: "4", maxAbv: "6", sort: "abv,desc", page: "0", size: "20" });

    await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(Object.fromEntries(requests()[1]?.entries() ?? [])).toEqual({ sort: "name,asc", page: "0", size: "20" });
  });

  it("sends one request when the filter sheet applies several choices together", async () => {
    transport.mockResolvedValue(pageOf(["Alpha"]));
    await renderWithLocale(<CatalogScreen />);
    await screen.findByText("Alpha");

    await act(async () => useFiltersStore.getState().apply({ ...emptyFilters(), style: "Gose", countryCode: "DE", min: "3", sort: "name,desc" }));

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    await settle(100);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["en", "No beers match your search.", "Clear search and filters"],
    ["fi", "Hakuehdoilla ei löytynyt oluita.", "Tyhjennä haku ja suodattimet"],
  ] as const)("says no beer matches and offers to clear the search and filters, in %s", async (locale, none, clear) => {
    transport.mockImplementation(async (url: string) => (new URL(url, "http://api.test").searchParams.has("style") ? pageOf([]) : pageOf(["Alpha"])));
    useFiltersStore.getState().apply({ ...emptyFilters(), style: "Mead" });
    await renderWithLocale(<CatalogScreen />, locale);

    expect(await screen.findByText(none)).toBeOnTheScreen();
    expect(screen.queryByText("No beers have been added yet.")).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: clear }));

    expect(await screen.findByText("Alpha")).toBeOnTheScreen();
    expect(screen.queryByText(none)).not.toBeOnTheScreen();
    expect(requests().at(-1)?.has("style")).toBe(false);
  });

  it("says the catalog is empty, not that nothing matches, when only the sort is set", async () => {
    transport.mockResolvedValue(pageOf([]));
    useFiltersStore.getState().apply({ ...emptyFilters(), sort: "abv,desc" });
    await renderWithLocale(<CatalogScreen />);

    expect(await screen.findByText("No beers have been added yet.")).toBeOnTheScreen();
  });
});

describe("what the Catalog keeps while the app is open", () => {
  it("keeps the query and the filters through a beer opened and closed, and starts empty on a fresh start", async () => {
    transport.mockResolvedValue(pageOf(["Alpha"]));
    useFiltersStore.getState().apply({ ...emptyFilters(), style: "IPA" });
    let show: (shown: boolean) => void = () => undefined;
    const Harness = () => {
      const [shown, setShown] = useState(true);
      show = setShown;
      return shown ? <CatalogScreen /> : null;
    };
    await renderWithLocale(<Harness />);
    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Search beers" }), "alp");
    await settle();
    await waitFor(() => expect(requests().at(-1)?.get("query")).toBe("alp"));
    await fireEvent.press(await screen.findByRole("button", { name: /^Alpha/ }));
    expect(mockPush).toHaveBeenCalledWith("/beers/id-Alpha");
    await act(async () => show(false));
    expect(screen.queryByRole("searchbox", { name: "Search beers" })).not.toBeOnTheScreen();

    await act(async () => show(true));

    expect(screen.getByRole("searchbox", { name: "Search beers" })).toHaveDisplayValue("alp");
    expect(screen.getByRole("button", { name: "Remove filter: IPA" })).toBeOnTheScreen();
    await screen.findByText("Alpha");
    expect(requests().at(-1)?.get("query")).toBe("alp");
    expect(requests().at(-1)?.get("style")).toBe("IPA");

    const coldStart = useFiltersStore.getInitialState();
    expect(coldStart.applied).toEqual(emptyFilters());
    expect(coldStart.text).toBe("");
  });
});

describe("a beer waiting for review", () => {
  it.each([
    ["en", "Waiting for review"],
    ["fi", "Odottaa tarkistusta"],
  ] as const)("is marked in the list and an approved one is not, in %s", async (locale, marker) => {
    transport.mockResolvedValue({
      data: { content: [beer("Mine", "PENDING"), beer("Public")], page: 0, totalElements: 2, totalPages: 1 },
      status: 200,
      headers: new Headers(),
    });

    await renderWithLocale(<CatalogScreen />, locale);

    const [mine, pub] = await screen.findAllByTestId("beer-row");
    expect(within(mine!).getByText(marker)).toBeOnTheScreen();
    expect(within(pub!).queryByText(marker)).not.toBeOnTheScreen();
    expect(screen.getAllByText(marker)).toHaveLength(1);
  });

  it("shows a status this build does not know as a generic marker rather than dropping it", async () => {
    transport.mockResolvedValue({ data: { content: [beer("Odd", "IN_REVIEW")], page: 0, totalElements: 1, totalPages: 1 }, status: 200, headers: new Headers() });

    await renderWithLocale(<CatalogScreen />);

    expect(await screen.findByText("Other")).toBeOnTheScreen();
  });
});
