import { fireEvent, screen } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";

import { AppProviders } from "@/lib/providers/AppProviders";
import { fakeTokenStore } from "@/testing/fakeTokenStore";

import { CellarEntryScreen } from "./CellarEntryScreen";
import { CellarScreen } from "./CellarScreen";
import { sampleCellar } from "./sampleCellar";

const signedIn = fakeTokenStore({ status: "signedIn" });
const Layout = () => (
  <AppProviders locale="en" tokenStore={signedIn}>
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

const withTwentyFour = sampleCellar.find((entry) => entry.bottles.length === 24)!;

describe("the cellar entry's screen", () => {
  it("opens a cellar row's entry and returns to the list with Back", async () => {
    await renderApp("/cellar");

    await fireEvent.press(await screen.findByRole("button", { name: /^Aamunkoi Hefeweizen,/ }));

    expect(await screen.findByRole("heading", { name: "Aamunkoi Hefeweizen" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/cellar/1");

    await fireEvent.press(screen.getByRole("button", { name: "Back to the cellar" }));

    expect(await screen.findByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
    expect(screen).toHavePathname("/cellar");
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
});
