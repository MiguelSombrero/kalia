import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { AppProviders } from "./AppProviders";

const Home = () => {
  const { t } = useTranslation();
  return <Text>{t("nav.home")}</Text>;
};

describe("AppProviders", () => {
  it("follows the locale when the device language changes while the app runs", async () => {
    const { rerender } = await render(
      <AppProviders locale="en">
        <Home />
      </AppProviders>,
    );
    expect(screen.getByText("Home")).toBeOnTheScreen();

    await rerender(
      <AppProviders locale="fi">
        <Home />
      </AppProviders>,
    );

    expect(await screen.findByText("Etusivu")).toBeOnTheScreen();
  });
});
