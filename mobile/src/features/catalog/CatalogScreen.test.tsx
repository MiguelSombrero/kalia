import { screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CatalogScreen } from "./CatalogScreen";

describe("CatalogScreen", () => {
  it.each([
    ["en", "Catalog", "Coming soon"],
    ["fi", "Oluet", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<CatalogScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });
});
