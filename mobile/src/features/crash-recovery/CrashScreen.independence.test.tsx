import { apiError, registerTransport, type Transport } from "@kalia/api";
import { cleanup, render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { StyleSheet } from "react-native";
import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { CrashScreen } from "./CrashScreen";

jest.mock("expo-application", () => ({ nativeApplicationVersion: "0.1.0", nativeBuildVersion: "26569207" }));
jest.mock("expo-splash-screen", () => ({ hideAsync: jest.fn(() => Promise.resolve()) }));

const words = {
  en: { title: "Something went wrong", body: "Kalia ran into an unexpected error. Restart it to carry on.", action: "Restart Kalia", reference: "Reference: " },
  fi: { title: "Jokin meni pieleen", body: "Kalia kohtasi odottamattoman virheen. Käynnistä se uudelleen jatkaaksesi.", action: "Käynnistä Kalia uudelleen", reference: "Viite: " },
} as const;
const locales = ["en", "fi"] as const;

const TRACE = "0af7651916cd43dd8448eb211c80319c";

const transport = jest.fn();
const fetchSpy = jest.fn();
const originalFetch = globalThis.fetch;
const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

// The shipped build: a development build also prints the scrubbed error message.
beforeEach(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  transport.mockReset();
  fetchSpy.mockReset();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  registerTransport(transport as unknown as Transport);
});

afterEach(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

// The screen renders outside every provider the app has, which the error may have come from.
const show = async (locale: (typeof locales)[number], error: Error = apiError("network", "Could not reach the backend", { traceId: TRACE })) => {
  await render(<CrashScreen locale={locale} error={error} onRestart={jest.fn()} />);
  return JSON.stringify(screen.toJSON());
};

describe("the crash screen depends on nothing that can change under an installed build", () => {
  it.each(locales)("is the same in %s whether the API client works or fails, and asks it for nothing", async (locale) => {
    transport.mockResolvedValue({ data: {}, status: 200, headers: new Headers() });
    const working = await show(locale);
    await cleanup();

    transport.mockRejectedValue(apiError("network", "Could not reach the backend", { traceId: TRACE }));
    fetchSpy.mockRejectedValue(new TypeError("Network request failed"));
    const failing = await show(locale);

    expect(failing).toEqual(working);
    expect(transport).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(locales)("prints the failed request's trace reference as it came in %s, and nothing else of the error", async (locale) => {
    await show(locale, apiError("http", "The backend said: $t(error.title) {{id}} https://evil.test/", { traceId: "$t(error.title)-{{id}}-<b>x</b>" }));

    expect(screen.getByText(`${words[locale].reference}$t(error.title)-{{id}}-<b>x</b>`)).toBeOnTheScreen();
    expect(screen.queryByText(/backend said|evil/)).not.toBeOnTheScreen();
  });

  it.each(locales)("shows no link and no image in %s", async (locale) => {
    await show(locale);

    expect(screen.queryByRole("link")).not.toBeOnTheScreen();
    expect(screen.queryByRole("image")).not.toBeOnTheScreen();
  });

  describe.each(["light", "dark"] as const)("when the system is %s, at the largest text size", (mode) => {
    it.each(locales)("keeps every word, its heading and its action reachable in %s", async (locale) => {
      jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
      atLargestFontScale();
      const expected = words[locale];

      await show(locale);

      const heading = screen.getByRole("heading", { name: expected.title });
      expect(heading.props.maxFontSizeMultiplier).toBe(2);
      expect(screen.getByText(expected.body).props.maxFontSizeMultiplier).toBeUndefined();
      expect(screen.getByRole("button", { name: expected.action })).toBeOnTheScreen();
      expect(screen.getByText(`${expected.reference}${TRACE}`)).toBeOnTheScreen();
      expect(StyleSheet.flatten(heading.props.style).height).toBeUndefined();
      expect(JSON.stringify(screen.toJSON())).toContain("RCTScrollView");
      expectScalesWithText();
    });
  });
});
