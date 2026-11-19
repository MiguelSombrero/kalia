import { registerTransport, type Transport } from "@kalia/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { screen } from "@testing-library/react-native";
import * as ExpoFont from "expo-font";
import { renderRouter } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";

import RootLayout from "@/app/_layout";
import { unsettleFaces } from "@/lib/design/fonts";

jest.mock("expo-application", () => ({ nativeBuildVersion: "1" }));
jest.mock("expo-localization", () => ({ useLocales: () => [{ languageCode: "en" }] }));
jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({ preventAutoHideAsync: jest.fn(() => Promise.resolve(true)), hideAsync: jest.fn(() => Promise.resolve()) }));

const transport = jest.fn();
const answer = (config: { minimumBuild: { ios: number; android: number }; maintenance: boolean }) =>
  transport.mockResolvedValue({ data: config, status: 200, headers: new Headers() });

const renderApp = () => renderRouter({ _layout: RootLayout, index: () => <Text>the app</Text> }, { initialUrl: "/" });

beforeEach(async () => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
  await AsyncStorage.clear();
});

afterEach(() => {
  unsettleFaces();
  jest.clearAllMocks();
});

describe.each([
  ["pending", [false, null]],
  ["failed", [false, new Error("no font")]],
  ["loaded", [true, null]],
] as const)("the root layout with the faces %s", (_, fonts) => {
  beforeEach(() => jest.mocked(ExpoFont.useFonts).mockReturnValue([...fonts]));

  it.each([
    ["update-required", { minimumBuild: { ios: 99, android: 99 }, maintenance: false }, /update required/i],
    ["maintenance", { minimumBuild: { ios: 0, android: 0 }, maintenance: true }, /down for maintenance/i],
  ])("opens the %s screen, found by its heading, before any deadline has passed", async (_reason, config, title) => {
    answer(config);

    await renderApp();

    expect(await screen.findByRole("heading", { name: title })).toBeOnTheScreen();
    expect(screen.queryByText("the app")).not.toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});
