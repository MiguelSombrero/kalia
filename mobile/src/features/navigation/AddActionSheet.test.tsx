import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { AddActionSheet } from "./AddActionSheet";
import { PixelRatio } from "react-native";

const mockBack = jest.fn();
const mockDismiss = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack, dismiss: mockDismiss, navigate: mockNavigate, replace: mockReplace, canGoBack: mockCanGoBack }) }));

beforeEach(() => {
  mockBack.mockReset();
  mockDismiss.mockReset();
  mockNavigate.mockReset();
  mockReplace.mockReset();
  mockCanGoBack.mockReset().mockReturnValue(true);
});

it("closes a directly opened sheet to Catalog when no history exists", async () => {
  mockCanGoBack.mockReturnValue(false);
  await renderWithLocale(<AddActionSheet />, "en");
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(mockReplace).toHaveBeenCalledWith("/catalog");
});

it("keeps its controls available at the largest text scale", async () => {
  const scale = jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(3.12);
  try {
    await renderWithLocale(<AddActionSheet />, "en");
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Find it in the catalog" })).toBeOnTheScreen();
  } finally {
    scale.mockRestore();
  }
});

it.each([
  ["en", "Add a beer", "Close", "Find it in the catalog"],
  ["fi", "Lisää olut", "Sulje", "Etsi katalogista"],
] as const)("offers visible dismissal and catalog navigation in %s", async (locale, title, close, browse) => {
  await renderWithLocale(<AddActionSheet />, locale);
  expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: close }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: browse }));
  expect(mockDismiss).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledWith("/catalog");
});
