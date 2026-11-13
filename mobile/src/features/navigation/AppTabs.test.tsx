import { AppProviders } from "@/lib/providers/AppProviders";
import { fireEvent, screen, within } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Redirect, Stack, useRouter } from "expo-router";
import { PixelRatio, Pressable, Text } from "react-native";
import { AppTabs } from "./AppTabs";
import { AddActionSheet } from "./AddActionSheet";
import { SignInSheet } from "./SignInSheet";
import { fakeTokenStore } from "@/testing/fakeTokenStore";

const Heading = ({ children }: { children: string }) => <Text role="heading">{children}</Text>;
const Home = () => <Redirect href="/catalog" />;
const Catalog = () => <Heading>Catalog</Heading>;
const Cellar = () => {
  const router = useRouter();
  return <><Heading>Cellar</Heading><Pressable role="button" onPress={() => router.push("/sign-in-sheet")}><Text>Sign in</Text></Pressable></>;
};
const Profile = () => <Heading>Profile</Heading>;
const Feed = () => <Heading>Feed</Heading>;
const Add = () => <Heading>Add</Heading>;

const store = fakeTokenStore({ status: "signedOut", expired: false });
const TabsInProviders = ({ locale }: { locale: "en" | "fi" }) => (
  <AppProviders locale={locale} tokenStore={store}>
    <Stack screenOptions={{ headerShown: false }} />
  </AppProviders>
);

const renderApp = (locale: "en" | "fi", initialUrl = "/") =>
  renderRouter(
    {
      _layout: () => <TabsInProviders locale={locale} />,
      "(tabs)/_layout": { default: AppTabs, unstable_settings: { anchor: "catalog" } },
      "(tabs)/index": Home,
      "(tabs)/feed": Feed,
      "(tabs)/catalog": Catalog,
      "(tabs)/add": Add,
      "(tabs)/cellar": Cellar,
      "(tabs)/profile": Profile,
      "add-sheet": AddActionSheet,
      "sign-in-sheet": SignInSheet,
    },
    { initialUrl },
  );

describe("AppTabs", () => {
  it.each([
    ["en", ["Feed", "Catalog", "Add a beer", "Cellar", "Profile"]],
    ["fi", ["Syöte", "Oluet", "Lisää olut", "Kellari", "Profiili"]],
  ] as const)("offers destinations and Add in order, labelled in %s", async (locale, labels) => {
    await renderApp(locale);

    const tabs = screen.getAllByLabelText(new RegExp(`^(${labels.join("|")})$`));
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual(labels);
  });

  it("reaches each tab's screen from the tab bar", async () => {
    await renderApp("en");

    for (const [tab, heading] of [
      ["Catalog", "Catalog"],
      ["Cellar", "Cellar"],
      ["Profile", "Profile"],
      ["Feed", "Feed"],
    ]) {
      await fireEvent.press(screen.getByLabelText(tab));
      expect(await screen.findByRole("heading", { name: heading })).toBeOnTheScreen();
    }
  });

  it.each([
    ["en", { feed: "Feed", catalog: "Catalog", cellar: "Cellar", profile: "Profile" }, "Add a beer"],
    ["fi", { feed: "Syöte", catalog: "Oluet", cellar: "Kellari", profile: "Profiili" }, "Lisää olut"],
  ] as const)("draws an icon beside every tab's word and on Add, hidden from assistive technology, in %s", async (locale, names, add) => {
    await renderApp(locale);

    for (const [icon, name] of Object.entries(names)) {
      const tab = screen.getByLabelText(name);
      expect(within(tab).getByText(name)).toBeOnTheScreen();
      const drawn = within(tab).getAllByTestId(`tab-icon-${icon}`, { includeHiddenElements: true });
      expect(drawn.length).toBeGreaterThan(0);
      for (const layer of drawn) {
        expect(layer.props.accessibilityElementsHidden).toBe(true);
        expect(layer.props.importantForAccessibility).toBe("no-hide-descendants");
      }
      expect(screen.queryByTestId(`tab-icon-${icon}`)).toBeNull();
    }
    const addTab = screen.getByLabelText(add);
    for (const layer of within(addTab).getAllByTestId("add-icon", { includeHiddenElements: true })) {
      expect(layer.props.accessibilityElementsHidden).toBe(true);
    }
    expect(screen.queryByTestId("add-icon")).toBeNull();
  });

  it("keeps all actions accessible at the largest text scale", async () => {
    const scale = jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.12);
    try {
      await renderApp("en");
      for (const name of ["Feed", "Catalog", "Add a beer", "Cellar", "Profile"]) {
        expect(screen.getByLabelText(name)).toBeOnTheScreen();
      }
    } finally {
      scale.mockRestore();
    }
  });

  it("opens the Add sheet instead of selecting the Add route", async () => {
    await renderApp("en");
    await screen.findByRole("heading", { name: "Catalog" });
    await fireEvent.press(screen.getByLabelText("Add a beer"));
    expect(await screen.findByRole("heading", { name: "Add a beer" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("heading", { name: "Catalog" })).toBeOnTheScreen();
  });

  it("goes to Catalog from Add when opened on another tab", async () => {
    await renderApp("en");
    await fireEvent.press(screen.getByLabelText("Feed"));
    await fireEvent.press(screen.getByLabelText("Add a beer"));
    await fireEvent.press(await screen.findByRole("button", { name: "Find it in the catalog" }));
    expect(await screen.findByRole("heading", { name: "Catalog" })).toBeOnTheScreen();
  });

  it.each([
    ["/add-sheet", "Add a beer"],
    ["/sign-in-sheet", "Sign in"],
  ])("returns to Catalog when %s is opened directly and closed", async (url, heading) => {
    await renderApp("en", url);
    expect(await screen.findByRole("heading", { name: heading })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByRole("heading", { name: "Catalog" })).toBeOnTheScreen();
  });

  it.each(["Close", "Sign in"])("returns to Cellar after sign-in sheet %s", async (action) => {
    store.set({ status: "signedOut", expired: false });
    store.signIn.mockResolvedValue("signedIn");
    await renderApp("en");
    await fireEvent.press(screen.getByLabelText("Cellar"));
    await fireEvent.press(await screen.findByRole("button", { name: "Sign in" }));
    await screen.findByRole("button", { name: "Close" });
    await fireEvent.press(screen.getByRole("button", { name: action }));
    expect(await screen.findByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
  });
});
