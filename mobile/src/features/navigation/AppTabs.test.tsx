import { AppProviders } from "@/lib/providers/AppProviders";
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { AppTabs } from "./AppTabs";

const Heading = ({ children }: { children: string }) => <Text role="heading">{children}</Text>;
const Home = () => <Heading>Home</Heading>;
const Catalog = () => <Heading>Catalog</Heading>;
const Cellar = () => <Heading>Cellar</Heading>;
const Profile = () => <Heading>Profile</Heading>;

const TabsInProviders = ({ locale }: { locale: "en" | "fi" }) => (
  <AppProviders locale={locale}>
    <AppTabs />
  </AppProviders>
);

const renderApp = (locale: "en" | "fi") =>
  renderRouter(
    {
      _layout: () => <TabsInProviders locale={locale} />,
      index: Home,
      catalog: Catalog,
      cellar: Cellar,
      profile: Profile,
    },
    { initialUrl: "/" },
  );

describe("AppTabs", () => {
  it.each([
    ["en", ["Home", "Catalog", "Cellar", "Profile"]],
    ["fi", ["Etusivu", "Oluet", "Kellari", "Profiili"]],
  ] as const)("offers four tabs, in order, labelled in %s", async (locale, labels) => {
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
      ["Home", "Home"],
    ]) {
      await fireEvent.press(screen.getByLabelText(tab));
      expect(await screen.findByRole("heading", { name: heading })).toBeOnTheScreen();
    }
  });
});
