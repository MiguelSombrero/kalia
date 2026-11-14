import { apiError, registerTransport, type Transport } from "@kalia/api";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { registerMobileTransport } from "@/lib/api/registerTransport";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { withLargestFont } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { BeerDetails, type BeerDetailsProps } from "./BeerDetails";

const ID = "6f1c2f6e-8f1e-4a0e-9a54-0f4a7e0b1c11";
const OTHER = "0a9c2f6e-8f1e-4a0e-9a54-0f4a7e0b1c22";
const SLOT = Symbol.for("@kalia/api.transport");

const transport = jest.fn();
const reply = (status: number, data: unknown) => ({ status, data, headers: new Headers() });

type Details = { id: string; name: string; abv: number; style: string; status: string; brewery: { id: string; name: string; city?: string; countryCode: string } };
const details = (over: Partial<Details> = {}): Details => ({
  id: ID,
  name: "Pale Ale",
  abv: 5.2,
  style: "IPA",
  status: "APPROVED",
  brewery: { id: "brewery-1", name: "Sinebrychoff", city: "Kerava", countryCode: "FI" },
  ...over,
});
const summary = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  abv: 6,
  style: "IPA",
  status: "APPROVED",
  brewery: { id: `brewery-${id}`, name: `Brewery of ${name}`, countryCode: "FI" },
  ...over,
});
const pageOf = (content: unknown[]) => reply(200, { content, page: 0, totalElements: content.length, totalPages: 1 });

/** Answers each call by what it asks for, so the order the screen asks in does not matter. */
const stack = ({ beer = reply(200, details()), similar = pageOf([]) }: { beer?: unknown; similar?: unknown } = {}) =>
  transport.mockImplementation(async (url: string) => {
    const answer = url.startsWith("/api/v1/beers/") ? beer : similar;
    if (answer instanceof Error) throw answer;
    return answer;
  });

const handlers = (): BeerDetailsProps => ({ id: ID, onClose: jest.fn(), onOpenBeer: jest.fn(), onShowStyle: jest.fn(), onShowBrewery: jest.fn(), onShowCountry: jest.fn() });

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});
afterEach(() => jest.restoreAllMocks());

describe("BeerDetails's loading, error and not-found states", () => {
  it("says it is loading, with placeholders, while the beer is read", async () => {
    transport.mockReturnValue(new Promise(() => undefined));

    await renderWithLocale(<BeerDetails {...handlers()} />, "fi");

    expect(screen.getByText("Ladataan olutta…")).toBeOnTheScreen();
    expect(screen.getByTestId("loading-placeholders")).toBeOnTheScreen();
  });

  it("says what failed, names the request and offers a retry that reads again", async () => {
    stack({ beer: apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" }) });

    await renderWithLocale(<BeerDetails {...handlers()} />, "fi");

    expect(await screen.findByText("Oluen lataus ei onnistunut.")).toBeOnTheScreen();
    expect(screen.getByText("Viite: 0af7651916cd43dd8448eb211c80319c")).toBeOnTheScreen();
    stack({ beer: reply(200, details()) });
    await fireEvent.press(screen.getByRole("button", { name: "Yritä uudelleen" }));
    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
  });

  it.each([
    ["en", "This beer is not in the catalog", "Back to the catalog"],
    ["fi", "Tätä olutta ei ole valikoimassa", "Takaisin oluisiin"],
  ] as const)("answers a 404 with one not-found state whose action closes the sheet, in %s", async (locale, message, action) => {
    stack({ beer: reply(404, { title: "Not Found" }) });
    const props = handlers();

    await renderWithLocale(<BeerDetails {...props} />, locale);

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText("Pale Ale")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: action }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("answers an id that cannot name a beer with the same state, without asking the API", async () => {
    await renderWithLocale(<BeerDetails {...handlers()} id="not-an-id" />, "en");

    expect(await screen.findByText("This beer is not in the catalog")).toBeOnTheScreen();
    expect(transport).not.toHaveBeenCalled();
  });

  describe("through the app's own transport", () => {
    const fetchMock = jest.fn();
    let warn: jest.SpyInstance;
    let error: jest.SpyInstance;

    beforeEach(() => {
      Reflect.deleteProperty(globalThis, SLOT);
      fetchMock.mockReset();
      jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
      warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      error = jest.spyOn(console, "error").mockImplementation(() => undefined);
      registerMobileTransport(fakeTokenStore({ status: "signedOut", expired: false }));
    });

    it("writes no error line for a 404, which is an answer", async () => {
      fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));

      await renderWithLocale(<BeerDetails {...handlers()} />, "en");

      expect(await screen.findByText("This beer is not in the catalog")).toBeOnTheScreen();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });

    it("still writes the line for a failure, so the silence above is the 404's alone", async () => {
      fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));

      await renderWithLocale(<BeerDetails {...handlers()} />, "en");

      expect(await screen.findByText("Couldn't load this beer.")).toBeOnTheScreen();
      expect([...warn.mock.calls, ...error.mock.calls].map(([line]) => String(line)).join("\n")).toContain('"status":500');
    });
  });
});

describe("BeerDetails's status", () => {
  it.each([
    ["en", "Waiting for review"],
    ["fi", "Odottaa tarkistusta"],
  ] as const)("marks a contributor's pending beer as waiting for review in %s", async (locale, label) => {
    stack({ beer: reply(200, details({ status: "PENDING" })) });

    await renderWithLocale(<BeerDetails {...handlers()} />, locale);

    expect(await screen.findByText(label)).toBeOnTheScreen();
  });

  it("marks an approved beer with nothing", async () => {
    stack();

    await renderWithLocale(<BeerDetails {...handlers()} />, "en");

    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    expect(screen.queryByText("Waiting for review")).toBeNull();
    expect(screen.queryByText("Other")).toBeNull();
  });

  it("reads a status this build does not know as the generic word, and still shows the beer", async () => {
    stack({ beer: reply(200, details({ status: "ARCHIVED" })) });

    await renderWithLocale(<BeerDetails {...handlers()} />, "fi");

    expect(await screen.findByText("Muu")).toBeOnTheScreen();
    expect(screen.getByText("Pale Ale")).toBeOnTheScreen();
  });
});

describe("BeerDetails's page", () => {
  it.each([
    ["en", "5.2", "Finland"],
    ["fi", "5,2", "Suomi"],
  ] as const)("shows the beer's card, its style, brewery, the brewery's city and its country named in %s", async (locale, strength, country) => {
    stack();

    await renderWithLocale(<BeerDetails {...handlers()} />, locale);

    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    expect(screen.getByTestId("beer-headline")).toBeOnTheScreen();
    expect(screen.getByText(strength, { exact: false })).toBeOnTheScreen();
    for (const text of ["IPA", "Sinebrychoff", "Kerava", country]) expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it("leaves the city out of a brewery that has none", async () => {
    stack({ beer: reply(200, details({ brewery: { id: "b", name: "Sinebrychoff", countryCode: "FI" } })) });

    await renderWithLocale(<BeerDetails {...handlers()} />, "en");

    expect(await screen.findByText("Sinebrychoff")).toBeOnTheScreen();
    expect(screen.queryByText("City", { exact: false })).toBeNull();
  });

  it("has nothing visible where the cellar action will go", async () => {
    stack();

    await renderWithLocale(<BeerDetails {...handlers()} />, "en");

    await screen.findByText("Pale Ale");
    expect(screen.queryByRole("button", { name: /cellar/i })).toBeNull();
    expect(screen.queryByText(/cellar/i)).toBeNull();
  });

  it("reads a long Finnish brewery and beer name in full at the largest font scale", async () => {
    const beer = "Kesäyön erikoisvahva portteri-vehnäolut";
    const brewery = "Oluttehtaiden ja panimoiden yhteisomistuksessa toimiva erikoisolutpanimo";
    stack({ beer: reply(200, details({ name: beer, brewery: { id: "b", name: brewery, city: "Jyväskylä", countryCode: "FI" } })), similar: pageOf([summary(OTHER, beer, { brewery: { id: "b2", name: brewery, countryCode: "FI" } })]) });

    await withLargestFont(async () => {
      await renderWithLocale(<BeerDetails {...handlers()} />, "fi");

      expect((await screen.findAllByText(beer)).length).toBeGreaterThan(0);
      expect(screen.getAllByText(brewery).length).toBeGreaterThan(0);
      await screen.findByTestId("similar-beer");
      expectScalesWithText();
    });
  });
});

describe("BeerDetails's similar beers", () => {
  it("lists up to five other beers of the beer's style, the beer itself left out", async () => {
    const six = [summary(ID, "Itself"), ...["A", "B", "C", "D", "E", "F"].map((n) => summary(`id-${n}`, `Beer ${n}`))];
    stack({ similar: pageOf(six) });

    await renderWithLocale(<BeerDetails {...handlers()} />, "en");

    expect(await screen.findAllByTestId("similar-beer")).toHaveLength(5);
    expect(screen.queryByText("Itself")).toBeNull();
    expect(screen.getByText("Beer E")).toBeOnTheScreen();
    expect(screen.queryByText("Beer F")).toBeNull();
    expect(screen.getByText("More of this style")).toBeOnTheScreen();
    const asked = transport.mock.calls.map(([url]) => String(url)).find((url) => url.startsWith("/api/v1/beers?"));
    expect(asked).toContain("style=IPA");
  });

  it.each([
    ["none found", pageOf([summary(ID, "Itself")])],
    ["the read failing", apiError("network", "Could not reach the backend")],
    ["the read answered with a failure", reply(500, {})],
  ])("is hidden, and the beer's own page left as it was, on %s", async (_case, similar) => {
    stack({ similar });

    await renderWithLocale(<BeerDetails {...handlers()} />, "en");

    expect(await screen.findByText("Pale Ale")).toBeOnTheScreen();
    await waitFor(() => expect(transport.mock.calls.some(([url]) => String(url).startsWith("/api/v1/beers?"))).toBe(true));
    expect(screen.queryByText("More of this style")).toBeNull();
    expect(screen.queryByText("Couldn't load", { exact: false })).toBeNull();
    expect(screen.getByText("Kerava")).toBeOnTheScreen();
  });

  it("opens the tapped beer in place of this one", async () => {
    stack({ similar: pageOf([summary(OTHER, "Porter")]) });
    const props = handlers();

    await renderWithLocale(<BeerDetails {...props} />, "en");
    await fireEvent.press(await screen.findByRole("button", { name: /^Porter,/ }));

    expect(props.onOpenBeer).toHaveBeenCalledWith(OTHER);
  });
});

describe("BeerDetails's links", () => {
  it("hands the style, the brewery and the country to the catalog, one each", async () => {
    stack();
    const props = handlers();

    await renderWithLocale(<BeerDetails {...props} />, "en");
    await screen.findByText("Pale Ale");
    await fireEvent.press(screen.getByRole("button", { name: /^IPA, show beers of this style/ }));
    await fireEvent.press(screen.getByRole("button", { name: /^Sinebrychoff, show beers from this brewery/ }));
    await fireEvent.press(screen.getByRole("button", { name: /^Finland, show beers from this country/ }));

    expect(props.onShowStyle).toHaveBeenCalledWith("IPA");
    expect(props.onShowBrewery).toHaveBeenCalledWith(expect.objectContaining({ id: "brewery-1", name: "Sinebrychoff" }));
    expect(props.onShowCountry).toHaveBeenCalledWith("FI");
  });
});
