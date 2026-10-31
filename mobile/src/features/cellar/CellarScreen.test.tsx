import { screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CellarScreen } from "./CellarScreen";

describe("CellarScreen", () => {
  it.each([
    ["en", "Cellar", "Coming soon"],
    ["fi", "Kellari", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<CellarScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });
});
