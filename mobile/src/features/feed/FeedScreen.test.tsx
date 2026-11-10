import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { FeedScreen } from "./FeedScreen";
import { PixelRatio } from "react-native";

const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ navigate: mockNavigate }) }));

describe("FeedScreen", () => {
  it.each([
    ["en", "Feed", "Coming soon"],
    ["fi", "Syöte", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<FeedScreen />, locale);

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });

  it("offers a route to the catalog", async () => {
    mockNavigate.mockReset();
    await renderWithLocale(<FeedScreen />, "en");
    await fireEvent.press(screen.getByRole("button", { name: "Find it in the catalog" }));
    expect(mockNavigate).toHaveBeenCalledWith("/catalog");
  });

  it("renders its content at the largest text scale", async () => {
    const scale = jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.12);
    try {
      await renderWithLocale(<FeedScreen />, "en");
      expect(screen.getByRole("heading", { name: "Feed" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Find it in the catalog" })).toBeOnTheScreen();
    } finally {
      scale.mockRestore();
    }
  });
});
