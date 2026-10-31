import { apiError, registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CatalogScreen } from "./CatalogScreen";

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

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
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
    expect(screen.getByText("Brewery 1 · IPA")).toBeOnTheScreen();
    expect(screen.getByText(abv)).toBeOnTheScreen();
    expect(screen.getByText("Stout")).toBeOnTheScreen();
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
});
