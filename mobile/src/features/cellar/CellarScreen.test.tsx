import { fireEvent, screen } from "@testing-library/react-native";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { CellarScreen } from "./CellarScreen";
import { PixelRatio } from "react-native";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));

describe("CellarScreen", () => {
  it.each([
    ["en", "Cellar", "Coming soon"],
    ["fi", "Kellari", "Tulossa pian"],
  ] as const)("shows its heading and the notice in %s", async (locale, heading, notice) => {
    await renderWithLocale(<CellarScreen />, locale, fakeTokenStore({ status: "signedIn" }));

    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
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
