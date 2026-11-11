import { render, screen } from "@testing-library/react-native";
import * as ExpoFont from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";
import { FontGate } from "./FontGate";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(() => Promise.resolve(true)), hideAsync: jest.fn(() => Promise.resolve()) }));

const useFonts = jest.mocked(ExpoFont.useFonts);

afterEach(() => jest.clearAllMocks());

describe("FontGate", () => {
  it("shows nothing and keeps the splash screen up while the faces load", async () => {
    useFonts.mockReturnValue([false, null]);

    await render(<FontGate><Text>content</Text></FontGate>);

    expect(screen.queryByText("content")).not.toBeOnTheScreen();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it("shows the app and hides the splash screen once they have loaded", async () => {
    useFonts.mockReturnValue([true, null]);

    await render(<FontGate><Text>content</Text></FontGate>);

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("shows the app in the system face when a face fails to load, so an update-required screen still opens", async () => {
    useFonts.mockReturnValue([false, new Error("no font")]);

    await render(<FontGate><Text>content</Text></FontGate>);

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});
