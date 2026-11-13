import { apiError, registerTransport, type Transport } from "@kalia/api";
import { cleanup, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { StyleSheet } from "react-native";
import { atLargestFontScale } from "@/testing/atLargestFontScale";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { BlockedScreen } from "./BlockedScreen";

const words = {
  updateRequired: {
    en: { title: "Update required", body: "This version of Kalia is out of date. Update the app to continue.", action: "Check again" },
    fi: { title: "Päivitys vaaditaan", body: "Tämä Kalian versio on vanhentunut. Päivitä sovellus jatkaaksesi.", action: "Tarkista uudelleen" },
  },
  maintenance: {
    en: { title: "Down for maintenance", body: "Kalia is being maintained and will be back soon. Try again in a moment.", action: "Check again" },
    fi: { title: "Huoltotauko", body: "Kalia on huollettavana ja palaa pian käyttöön. Yritä hetken kuluttua uudelleen.", action: "Tarkista uudelleen" },
  },
} as const;

const reasons = ["updateRequired", "maintenance"] as const;
const locales = ["en", "fi"] as const;

const transport = jest.fn();
const fetchSpy = jest.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  transport.mockReset();
  fetchSpy.mockReset();
  globalThis.fetch = fetchSpy as unknown as typeof fetch;
  registerTransport(transport as unknown as Transport);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

const render = async (reason: (typeof reasons)[number], locale: (typeof locales)[number]) => {
  await renderWithLocale(<BlockedScreen reason={reason} onCheckAgain={jest.fn()} isChecking={false} />, locale);
  return JSON.stringify(screen.toJSON());
};

describe.each(reasons)("the %s screen depends on nothing that can change under an installed build", (reason) => {
  it.each(locales)("is the same in %s whether the API client works or fails, and asks it for nothing", async (locale) => {
    transport.mockResolvedValue({ data: { minimumBuild: { ios: 99, android: 99 }, maintenance: true }, status: 200, headers: new Headers() });
    const working = await render(reason, locale);
    await cleanup();

    transport.mockRejectedValue(apiError("network", "Could not reach the backend", { traceId: "0af7651916cd43dd8448eb211c80319c" }));
    fetchSpy.mockRejectedValue(new TypeError("Network request failed"));
    const failing = await render(reason, locale);

    expect(failing).toEqual(working);
    expect(transport).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/0af7651916cd43dd8448eb211c80319c|backend/)).not.toBeOnTheScreen();
  });

  it.each(locales)("shows no link and no image in %s, and names no store", async (locale) => {
    await render(reason, locale);

    expect(screen.queryByRole("link")).not.toBeOnTheScreen();
    expect(screen.queryByRole("image")).not.toBeOnTheScreen();
    expect(screen.queryByText(/app store|google play|play store|https?:|minuut|minute|tunti|hour/i)).not.toBeOnTheScreen();
  });

  describe.each(["light", "dark"] as const)("when the system is %s, at the largest text size", (mode) => {
    it.each(locales)("keeps every word, its heading and its action reachable in %s", async (locale) => {
      jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
      atLargestFontScale();
      const expected = words[reason][locale];

      await render(reason, locale);

      const heading = screen.getByRole("heading", { name: expected.title });
      expect(heading.props.maxFontSizeMultiplier).toBe(2);
      expect(screen.getByText(expected.body).props.maxFontSizeMultiplier).toBeUndefined();
      expect(screen.getByRole("button", { name: expected.action })).toBeOnTheScreen();
      expect(screen.getByText(expected.body)).toBeOnTheScreen();
      expect(StyleSheet.flatten(heading.props.style).height).toBeUndefined();
      expect(JSON.stringify(screen.toJSON())).toContain("RCTScrollView");
      expectScalesWithText();
    });
  });
});
