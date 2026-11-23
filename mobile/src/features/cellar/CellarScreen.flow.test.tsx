import { registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { entryOf } from "@/testing/cellarEntries";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarScreen } from "./CellarScreen";
import type { CellarEntry } from "./types";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const transport = jest.fn();
const answer = (data: unknown) => ({ data, status: 200, headers: new Headers() });
const problem = { data: { title: "Server error", traceId: "abc123" }, status: 500, headers: new Headers() };
const renderCellar = (locale: "en" | "fi" = "en") =>
  renderWithLocale(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CellarScreen />
    </SafeAreaProvider>,
    locale,
    fakeTokenStore({ status: "signedIn" }),
  );
const CELLAR_LIST = /^(Cellar|Kellari)$/;
const list = () => screen.getByLabelText(CELLAR_LIST);
const pull = () => act(async () => list().props.refreshControl.props.onRefresh());
const rowNames = () => screen.getAllByRole("listitem").map((row) => String(row.props.accessibilityLabel).split(",")[0]);

const cellar: CellarEntry[] = [
  entryOf({ id: "1", name: "Zeta Stout", brewery: "Kallio Barrel Works", style: "Imperial Stout", abv: 9, bestBefore: ["2030-01-01", "2030-01-01"] }),
  entryOf({ id: "2", name: "Pimeä Portteri", brewery: "Pohjanranta", style: "Baltic Porter", abv: 7.2, bestBefore: ["2027-05-01"] }),
  entryOf({ id: "3", name: "Hazy Hoax", brewery: "Kolmas Linja", style: "New England IPA", abv: 6.5, bestBefore: ["2026-01-01", undefined, undefined] }),
  entryOf({ id: "4", name: "Gone Beer", brewery: "Closed Brewery", style: "Mead", abv: 11, bestBefore: [undefined], withdrawn: true }),
];

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockReset();
  mockNavigate.mockReset();
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the Cellar tab's read", () => {
  it("shows its loading state while the read is out, and the cellar once it is in", async () => {
    let resolve: (value: unknown) => void = () => undefined;
    transport.mockReturnValue(new Promise((done) => (resolve = done)));
    await renderCellar();

    expect(screen.getByText("Loading your cellar…")).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
    expect(screen.queryByRole("summary")).not.toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load your cellar.")).not.toBeOnTheScreen();

    await act(async () => resolve(answer(cellar)));

    expect(await screen.findByRole("summary", { name: "4 beers · 7 bottles" })).toBeOnTheScreen();
    expect(screen.queryByText("Loading your cellar…")).not.toBeOnTheScreen();
  });

  it.each([
    ["en", "Couldn't load your cellar.", "Try again"],
    ["fi", "Kellarisi lataaminen ei onnistunut.", "Yritä uudelleen"],
  ] as const)("says the read failed, with its reference, and reads again on retry in %s", async (locale, message, retry) => {
    transport.mockResolvedValueOnce(problem);
    await renderCellar(locale);

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText(/Loading|Ladataan/)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(CELLAR_LIST)).not.toBeOnTheScreen();

    transport.mockResolvedValueOnce(answer(cellar));
    await fireEvent.press(screen.getByRole("button", { name: retry }));

    expect(await screen.findByLabelText(CELLAR_LIST)).toBeOnTheScreen();
    expect(screen.queryByText(message)).not.toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("shows an empty cellar as empty, not as loading or failed", async () => {
    transport.mockResolvedValue(answer([]));
    await renderCellar();

    expect(await screen.findByRole("heading", { name: "Your cellar is empty" })).toBeOnTheScreen();
    expect(screen.queryByText("Loading your cellar…")).not.toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load your cellar.")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Add a bottle" }));
    expect(mockPush).toHaveBeenCalledWith("/add-sheet");
    await fireEvent.press(screen.getByRole("button", { name: "Browse the catalog" }));
    expect(mockNavigate).toHaveBeenCalledWith("/catalog");
  });

  it("reads again on a pull to refresh, and shows what the new read holds", async () => {
    transport.mockResolvedValueOnce(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);

    transport.mockResolvedValueOnce(answer([...cellar, entryOf({ id: "5", name: "Fresh Arrival" })]));
    await pull();

    expect(transport).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("summary", { name: "5 beers · 8 bottles" })).toBeOnTheScreen();
    expect(screen.getByText("Fresh Arrival")).toBeOnTheScreen();
  });

  it("keeps the cellar on the screen and says it may be out of date when a pull to refresh fails", async () => {
    transport.mockResolvedValueOnce(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);

    transport.mockResolvedValueOnce(problem);
    await pull();

    expect(await screen.findByText("Couldn't refresh your cellar. What you see may be out of date.")).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);

    transport.mockResolvedValueOnce(answer(cellar));
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await act(async () => void jest.advanceTimersByTime(0));
    expect(screen.queryByText(/may be out of date/)).not.toBeOnTheScreen();
  });

  it("marks a withdrawn entry and shows a style and a container the app does not know, rather than dropping them", async () => {
    const odd = entryOf({ id: "9", name: "Mystery Brew", style: "Gruit Sour Hybrid", bestBefore: [undefined] });
    const growler = { ...odd, bottles: odd.bottles.map((bottle) => ({ ...bottle, containerType: "GROWLER" })) } as unknown as CellarEntry;
    transport.mockResolvedValue(answer([...cellar, growler]));
    await renderCellar();

    expect(await screen.findByRole("listitem", { name: "Gone Beer, Closed Brewery, Mead, 11 %, 1 bottle, Withdrawn from the catalog" })).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: "Mystery Brew, Brewery 9, Gruit Sour Hybrid, 5 %, 1 bottle" })).toBeOnTheScreen();
    expect(screen.getByRole("summary", { name: "5 beers · 8 bottles" })).toBeOnTheScreen();
  });

  it.each([
    ["Style", ["Pimeä Portteri", "Zeta Stout", "Gone Beer", "Hazy Hoax"]],
    ["Strength", ["Gone Beer", "Zeta Stout", "Pimeä Portteri", "Hazy Hoax"]],
    ["Bottles", ["Hazy Hoax", "Zeta Stout", "Gone Beer", "Pimeä Portteri"]],
    ["Best before", ["Hazy Hoax", "Pimeä Portteri", "Zeta Stout", "Gone Beer"]],
    ["Name", ["Gone Beer", "Hazy Hoax", "Pimeä Portteri", "Zeta Stout"]],
  ])("orders what the API answered by %s", async (label, expected) => {
    transport.mockResolvedValue(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);

    await fireEvent.press(screen.getByRole("button", { name: "Sort, Name" }));
    await fireEvent.press(screen.getByRole("button", { name: label }));

    expect(rowNames()).toEqual(expected);
  });

  it("narrows what the API answered by the find field, by beer and by brewery, without another read", async () => {
    transport.mockResolvedValue(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);

    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find in my cellar" }), "pimea");
    expect(rowNames()).toEqual(["Pimeä Portteri"]);
    await fireEvent.changeText(screen.getByRole("searchbox", { name: "Find in my cellar" }), "kallio");
    expect(rowNames()).toEqual(["Zeta Stout"]);

    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("reads a long Finnish beer name in full at the largest text size, and finds each row by its name", async () => {
    const name = "Pohjoisen Pitkän Pimeän Kauden Kaakaokauraolut";
    transport.mockResolvedValue(answer([entryOf({ id: "1", name, brewery: "Itäisen Saaristomeren Käsityöpanimoyhtiö", style: "Oatmeal Stout", abv: 9, bestBefore: [undefined, undefined] }), cellar[1]]));
    atLargestFontScale();
    await renderCellar("fi");

    const row = await screen.findByRole("listitem", { name: `${name}, Itäisen Saaristomeren Käsityöpanimoyhtiö, Oatmeal Stout, 9 %, 2 pulloa` });
    expect(within(row).getByText(name)).toBeOnTheScreen();
    expect(within(row).getByText(name).props.numberOfLines).toBeUndefined();
    expectScalesWithText();
  });
});

describe("the Cellar tab on the app's return to the foreground", () => {
  const stubAppState = () => {
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: jest.fn() };
    });
    return {
      background: () => act(() => onChange("background")),
      foreground: () => act(() => onChange("active")),
    };
  };

  it("reads the cellar again when its data is older than 60 seconds", async () => {
    const app = stubAppState();
    transport.mockResolvedValue(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);
    transport.mockResolvedValueOnce(answer([entryOf({ id: "7", name: "Newer Beer" })]));

    await app.background();
    await act(async () => void jest.advanceTimersByTime(60_001));
    await app.foreground();

    expect(await screen.findByText("Newer Beer")).toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("does not read again when its data is fresher than 60 seconds", async () => {
    const app = stubAppState();
    transport.mockResolvedValue(answer(cellar));
    await renderCellar();
    await screen.findByLabelText(CELLAR_LIST);

    await app.background();
    await act(async () => void jest.advanceTimersByTime(59_000));
    await app.foreground();

    expect(transport).toHaveBeenCalledTimes(1);
  });
});

describe("a long cellar", () => {
  it("is drawn a window at a time, so 2,000 bottles cost no more than the screen shows", async () => {
    const beers = Array.from({ length: 2000 }, (_, index) => entryOf({ id: `${index}`, name: `Beer ${String(index).padStart(4, "0")}` }));
    transport.mockResolvedValue(answer(beers));
    await renderCellar();

    expect(await screen.findByRole("summary", { name: "2000 beers · 2000 bottles" })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem").length).toBeLessThan(100);
  });
});
