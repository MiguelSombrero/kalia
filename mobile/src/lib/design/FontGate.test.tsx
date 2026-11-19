import { act, render, screen } from "@testing-library/react-native";
import * as ExpoFont from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";

import { FONT_DEADLINE_MS, FontGate } from "./FontGate";
import { facesKey, textStyle, unsettleFaces } from "./fonts";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(() => Promise.resolve(true)), hideAsync: jest.fn(() => Promise.resolve()) }));

const useFonts = jest.mocked(ExpoFont.useFonts);

let consoleError: jest.SpyInstance;
let consoleWarn: jest.SpyInstance;

const renderGate = () => render(<FontGate><Text>content</Text></FontGate>);
const warnings = () => [...consoleError.mock.calls, ...consoleWarn.mock.calls].map(([line]) => JSON.parse(String(line)) as { level: string; message: string; reason?: string });

beforeEach(() => {
  jest.useFakeTimers();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  unsettleFaces();
});

describe("FontGate", () => {
  it("shows nothing and keeps the splash screen up while the faces load and the deadline has not passed", async () => {
    useFonts.mockReturnValue([false, null]);

    await renderGate();
    await act(() => jest.advanceTimersByTime(FONT_DEADLINE_MS - 1));

    expect(screen.queryByText("content")).not.toBeOnTheScreen();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
    expect(warnings()).toEqual([]);
  });

  it("shows the app and hides the splash screen once they have loaded, in the bundled face", async () => {
    useFonts.mockReturnValue([true, null]);

    await renderGate();

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(textStyle("body", "bold").fontFamily).toBe("BricolageGrotesque_700Bold");
    expect(warnings()).toEqual([]);
  });

  it("shows the app in the system face when a face fails to load, so an update-required screen still opens, and writes one WARN", async () => {
    useFonts.mockReturnValue([false, new Error("no font")]);

    await renderGate();

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(textStyle("body", "bold").fontFamily).toBeUndefined();
    expect(warnings()).toEqual([expect.objectContaining({ level: "warn", reason: "failed" })]);
  });

  it("shows the app once the deadline passes with the load still pending, hides the splash screen and writes one WARN", async () => {
    useFonts.mockReturnValue([false, null]);

    await renderGate();
    await act(() => jest.advanceTimersByTime(FONT_DEADLINE_MS));

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(warnings()).toEqual([expect.objectContaining({ level: "warn", reason: "late" })]);
  });

  it("keeps the system face for the rest of the session when the faces load after the deadline, and says nothing more", async () => {
    useFonts.mockReturnValue([false, null]);
    const view = await renderGate();
    await act(() => jest.advanceTimersByTime(FONT_DEADLINE_MS));
    expect(facesKey()).toBe("system");

    useFonts.mockReturnValue([true, null]);
    await view.rerender(<FontGate><Text>content</Text></FontGate>);
    await act(() => jest.advanceTimersByTime(FONT_DEADLINE_MS));

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(facesKey()).toBe("system");
    expect(textStyle("body", "bold").fontFamily).toBeUndefined();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
    expect(warnings()).toHaveLength(1);
  });

  it("opens at once, without a second wait or WARN, when it is mounted again after the faces settled", async () => {
    useFonts.mockReturnValue([false, null]);
    const first = await renderGate();
    await act(() => jest.advanceTimersByTime(FONT_DEADLINE_MS));
    await first.unmount();

    await renderGate();

    expect(screen.getByText("content")).toBeOnTheScreen();
    expect(warnings()).toHaveLength(1);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});

describe("textStyle", () => {
  it.each([
    ["normal", "400"],
    ["medium", "500"],
    ["bold", "700"],
  ] as const)("names the system face and the %s weight when the bundled faces are not loaded", (weight, fontWeight) => {
    expect(textStyle("body", weight)).toEqual(expect.objectContaining({ fontWeight }));
    expect(textStyle("body", weight).fontFamily).toBeUndefined();
  });
});
