import { screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { FeedScreen } from "./FeedScreen";

describe("FeedScreen", () => {
  it.each([
    ["en", "Home", "Coming soon"],
    ["fi", "Etusivu", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<FeedScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });
});
