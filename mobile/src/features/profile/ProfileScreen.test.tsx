import { screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ProfileScreen } from "./ProfileScreen";

describe("ProfileScreen", () => {
  it.each([
    ["en", "Profile", "Coming soon"],
    ["fi", "Profiili", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<ProfileScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });
});
