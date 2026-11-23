import { fireEvent, screen } from "@testing-library/react-native";
import { PixelRatio } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarScreen } from "./CellarScreen";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));

describe("CellarScreen", () => {
  it.each([
    ["en", "Cellar", "17 beers · 50 bottles"],
    ["fi", "Kellari", "17 olutta · 50 pulloa"],
  ] as const)("shows a signed-in user's cellar with its totals in %s", async (locale, heading, totals) => {
    await renderWithLocale(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <CellarScreen />
      </SafeAreaProvider>,
      locale,
      fakeTokenStore({ status: "signedIn" }),
    );

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByRole("summary", { name: totals })).toBeOnTheScreen();
  });

  it.each([
    ["en", "Keep track of the bottles you own.", "Sign in"],
    ["fi", "Pidä kirjaa omistamistasi pulloista.", "Kirjaudu sisään"],
  ] as const)("invites signed-out users to sign in in %s", async (locale, invitation, action) => {
    mockPush.mockReset();
    await renderWithLocale(<CellarScreen />, locale, fakeTokenStore({ status: "signedOut", expired: false }));
    expect(screen.getByText(invitation)).toBeOnTheScreen();
    expect(screen.getByText(locale === "en" ? "Coming soon" : "Tulossa pian")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: action }));
    expect(mockPush).toHaveBeenCalledWith("/sign-in-sheet");
  });

  it("renders the signed-out invitation at the largest text scale", async () => {
    const scale = jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.12);
    try {
      await renderWithLocale(<CellarScreen />, "en", fakeTokenStore({ status: "signedOut", expired: false }));
      expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Find it in the catalog" })).toBeOnTheScreen();
    } finally {
      scale.mockRestore();
    }
  });
});
