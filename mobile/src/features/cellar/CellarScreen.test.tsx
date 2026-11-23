import { registerTransport, type Transport } from "@kalia/api";
import { fireEvent, screen } from "@testing-library/react-native";
import { PixelRatio } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { entryOf } from "@/testing/cellarEntries";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { CellarScreen } from "./CellarScreen";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({ ...jest.requireActual("expo-router"), useRouter: () => ({ push: mockPush, navigate: mockNavigate }) }));

const transport = jest.fn();

beforeEach(() => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
});

describe("CellarScreen", () => {
  it.each([
    ["en", "Cellar", "2 beers · 5 bottles"],
    ["fi", "Kellari", "2 olutta · 5 pulloa"],
  ] as const)("reads a signed-in user's cellar from the API and shows its totals in %s", async (locale, heading, totals) => {
    transport.mockResolvedValue({
      data: [entryOf({ id: "1", name: "Kuiva Karhu", bestBefore: [undefined, undefined, undefined] }), entryOf({ id: "2", name: "Hazy Hoax", bestBefore: [undefined, undefined] })],
      status: 200,
      headers: new Headers(),
    });
    await renderWithLocale(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <CellarScreen />
      </SafeAreaProvider>,
      locale,
      fakeTokenStore({ status: "signedIn" }),
    );

    expect(await screen.findByRole("summary", { name: totals })).toBeOnTheScreen();
    expect(screen.getByRole("heading", { name: heading })).toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0]).toBe("/api/v1/cellar");
  });

  it.each([
    ["en", "Keep track of the bottles you own.", "Sign in"],
    ["fi", "Pidä kirjaa omistamistasi pulloista.", "Kirjaudu sisään"],
  ] as const)("invites signed-out users to sign in in %s", async (locale, invitation, action) => {
    mockPush.mockReset();
    await renderWithLocale(<CellarScreen />, locale, fakeTokenStore({ status: "signedOut", expired: false }));
    expect(transport).not.toHaveBeenCalled();
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
