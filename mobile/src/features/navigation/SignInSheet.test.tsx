import { fireEvent, screen } from "@testing-library/react-native";
import { fakeTokenStore } from "@/testing/fakeTokenStore";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { SignInSheet } from "./SignInSheet";
import { PixelRatio } from "react-native";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack }) }));

beforeEach(() => {
  mockBack.mockReset();
  mockReplace.mockReset();
  mockCanGoBack.mockReset().mockReturnValue(true);
});

it.each([
  ["en", "Sign in", "Close", "Sign-in didn't work. Try again."],
  ["fi", "Kirjaudu sisään", "Sulje", "Kirjautuminen ei onnistunut. Yritä uudelleen."],
] as const)("shows failures and permits retry and dismissal in %s", async (locale, action, close, message) => {
  const store = fakeTokenStore({ status: "signedOut", expired: false });
  store.signIn.mockResolvedValueOnce("failed").mockResolvedValueOnce("cancelled");
  await renderWithLocale(<SignInSheet />, locale, store);
  await fireEvent.press(screen.getByRole("button", { name: action }));
  expect(await screen.findByText(message)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: action }));
  expect(screen.queryByText(message)).not.toBeOnTheScreen();
  expect(store.signIn).toHaveBeenCalledWith(locale);
  await fireEvent.press(screen.getByRole("button", { name: close }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("returns to the initiating screen after successful sign-in", async () => {
  const store = fakeTokenStore({ status: "signedOut", expired: false });
  await renderWithLocale(<SignInSheet />, "en", store);
  await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});

it("closes a directly opened sheet to Catalog when no history exists", async () => {
  mockCanGoBack.mockReturnValue(false);
  await renderWithLocale(<SignInSheet />, "en", fakeTokenStore({ status: "signedOut", expired: false }));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(mockReplace).toHaveBeenCalledWith("/catalog");
});

it("keeps its controls available at the largest text scale", async () => {
  const scale = jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.12);
  try {
    await renderWithLocale(<SignInSheet />, "en", fakeTokenStore({ status: "signedOut", expired: false }));
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
  } finally {
    scale.mockRestore();
  }
});
