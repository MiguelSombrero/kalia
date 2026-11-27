import { registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { AppState, type AppStateStatus, Text } from "react-native";

import { AppProviders } from "@/lib/providers/AppProviders";
import { entryOf } from "@/testing/cellarEntries";
import { fakeTokenStore } from "@/testing/fakeTokenStore";

import { CellarEntryScreen } from "./CellarEntryScreen";
import { CellarScreen } from "./CellarScreen";

const withTwentyFour = entryOf({ id: "4", name: "Long Cellared Stout", bestBefore: Array.from({ length: 24 }, () => "2030-01-01") });
const cellar = [entryOf({ id: "1", name: "Aamunkoi Hefeweizen" }), withTwentyFour];
const transport = jest.fn();
let store = fakeTokenStore({ status: "signedIn" });

beforeEach(() => {
  store = fakeTokenStore({ status: "signedIn" });
  transport.mockReset();
  transport.mockResolvedValue({ data: cellar, status: 200, headers: new Headers() });
  registerTransport(transport as unknown as Transport);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const problem = { data: { title: "Server error" }, status: 500, headers: new Headers() };
const pastStaleTime = () => act(async () => void jest.advanceTimersByTime(60_001));
const openRow = async (name: RegExp) => fireEvent.press(await screen.findByRole("button", { name }));

const Layout = () => (
  <AppProviders locale="en" tokenStore={store}>
    <Stack screenOptions={{ headerShown: false }} />
  </AppProviders>
);
type PaneProps = { name: string };
const Pane = ({ name }: PaneProps) => <Text role="heading">{name}</Text>;

const renderApp = (initialUrl: string) =>
  renderRouter(
    {
      _layout: Layout,
      "(tabs)/_layout": { default: () => <Stack screenOptions={{ headerShown: false }} />, unstable_settings: { anchor: "catalog" } },
      "(tabs)/catalog": () => <Pane name="Catalog root" />,
      "(tabs)/cellar/_layout": { default: () => <Stack screenOptions={{ headerShown: false }} />, unstable_settings: { anchor: "index" } },
      "(tabs)/cellar/index": CellarScreen,
      "(tabs)/cellar/[id]": CellarEntryScreen,
      "add-sheet": () => <Pane name="Add sheet" />,
      "beers/[id]": () => <Pane name="Beer page" />,
    },
    { initialUrl },
  );

describe("the cellar entry's screen", () => {
  it("opens a cellar row's entry and returns to the list with Back", async () => {
    await renderApp("/cellar");

    await fireEvent.press(await screen.findByRole("button", { name: /^Aamunkoi Hefeweizen,/ }));

    expect(await screen.findByRole("heading", { name: "Aamunkoi Hefeweizen" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/cellar/1");
    expect(transport).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: "Back to the cellar" }));

    expect(await screen.findByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/cellar");
  });

  it("opens an entry from a list older than the stale time without asking for anything", async () => {
    await renderApp("/cellar");
    await screen.findByRole("button", { name: /^Aamunkoi Hefeweizen,/ });
    await pastStaleTime();

    await openRow(/^Aamunkoi Hefeweizen,/);

    expect(await screen.findByRole("heading", { name: "Aamunkoi Hefeweizen" })).toBeOnTheScreen();
    await pastStaleTime();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("shows the bottles the list holds after its refresh has failed, without asking again", async () => {
    await renderApp("/cellar");
    await screen.findByRole("button", { name: /^Long Cellared Stout,/ });
    transport.mockResolvedValue(problem);
    await act(async () => screen.getByLabelText("Cellar").props.refreshControl.props.onRefresh());
    await screen.findByText("Couldn't refresh your cellar. What you see may be out of date.");

    await openRow(/^Long Cellared Stout,/);

    expect(await screen.findByRole("heading", { name: "Long Cellared Stout" })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("keeps its bottles when the list's refresh fails while it is open", async () => {
    let onChange: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener) => {
      onChange = listener;
      return { remove: jest.fn() };
    });
    await renderApp("/cellar");
    await openRow(/^Long Cellared Stout,/);
    await screen.findByRole("heading", { name: "Long Cellared Stout" });
    transport.mockResolvedValue(problem);

    await act(() => onChange("background"));
    await pastStaleTime();
    await act(() => onChange("active"));
    await act(async () => void jest.advanceTimersByTime(0));

    expect(transport).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Long Cellared Stout" })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(24);

    await fireEvent.press(screen.getByRole("button", { name: "Back to the cellar" }));
    expect(await screen.findByText("Couldn't refresh your cellar. What you see may be out of date.")).toBeOnTheScreen();
  });

  it("lists every bottle of the beer it was opened for", async () => {
    await renderApp(`/cellar/${withTwentyFour.id}`);

    expect(await screen.findByRole("heading", { name: withTwentyFour.beer.name })).toBeOnTheScreen();
    expect(screen.getAllByRole("listitem")).toHaveLength(24);
  });

  it("goes to the beer's catalog page", async () => {
    await renderApp("/cellar/1");

    await fireEvent.press(await screen.findByRole("button", { name: "See in the catalog" }));

    expect(await screen.findByRole("heading", { name: "Beer page" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/beers/beer-1");
  });

  it("goes to the add sheet", async () => {
    await renderApp("/cellar/1");

    await fireEvent.press(await screen.findByRole("button", { name: "Add a bottle" }));

    expect(await screen.findByRole("heading", { name: "Add sheet" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/add-sheet");
  });

  it("says a beer that is not in the cellar is not, with a way back", async () => {
    await renderApp("/cellar/gone");

    expect(await screen.findByText("This beer is no longer in your cellar.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Add a bottle" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Back to the cellar" }));

    expect(await screen.findByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
  });

  it("says the cellar could not be read when it has none to draw from, and reads again on retry", async () => {
    transport.mockResolvedValueOnce({ data: { title: "Server error" }, status: 500, headers: new Headers() });
    await renderApp("/cellar/1");

    expect(await screen.findByText("Couldn't load your cellar.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Aamunkoi Hefeweizen" })).toBeOnTheScreen();
  });

  it("returns to the list's invitation, with none of the entry, when the session ends", async () => {
    await renderApp("/cellar/1");
    await screen.findByRole("heading", { name: "Aamunkoi Hefeweizen" });

    await act(async () => store.set({ status: "signedOut", expired: true }));

    expect(await screen.findByText("Keep track of the bottles you own.")).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: "Aamunkoi Hefeweizen" })).not.toBeOnTheScreen();
  });
});
