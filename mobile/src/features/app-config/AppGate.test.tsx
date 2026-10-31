import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiError, registerTransport, type Transport } from "@kalia/api";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { focusManager } from "@tanstack/react-query";
import { Platform, Text } from "react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { AppGate } from "./AppGate";

jest.mock("expo-application", () => ({ nativeBuildVersion: "1" }));
const application = jest.requireMock<{ nativeBuildVersion: string | null }>("expo-application");

type AppConfig = { minimumBuild: { ios: number; android: number }; maintenance: boolean };

const transport = jest.fn();
const answer = (config: AppConfig) =>
  transport.mockResolvedValue({ data: config, status: 200, headers: new Headers() });
const unreachable = () => transport.mockRejectedValue(apiError("network", "Could not reach the backend"));
const minimum = (ios: number, android = ios): AppConfig => ({ minimumBuild: { ios, android }, maintenance: false });
const maintenance = (): AppConfig => ({ ...minimum(0), maintenance: true });

const MEMORY_KEY = "kalia.appConfig.minimumBuild";
const opened = () => screen.findByText("Kalia is open");
const renderGate = (locale: "en" | "fi" = "en") =>
  renderWithLocale(
    <AppGate>
      <Text>Kalia is open</Text>
    </AppGate>,
    locale,
  );

const originalOS = Platform.OS;

beforeEach(async () => {
  transport.mockReset();
  registerTransport(transport as unknown as Transport);
  application.nativeBuildVersion = "1";
  Platform.OS = "ios";
  await AsyncStorage.clear();
});

afterEach(() => {
  Platform.OS = originalOS;
  jest.restoreAllMocks();
});

describe("AppGate", () => {
  it("opens the app when no minimum has been raised", async () => {
    answer(minimum(0));

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Check again" })).not.toBeOnTheScreen();
  });

  it("blocks with the update screen when the server's minimum exceeds the app's build", async () => {
    answer(minimum(2));

    await renderGate();

    expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
    expect(
      screen.getByText("This version of Kalia is out of date. Update the app to continue."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Kalia is open")).not.toBeOnTheScreen();
  });

  it.each([
    ["equals", 1],
    ["is below", 0],
  ])("does not block when the minimum %s the app's build", async (_, serverMinimum) => {
    answer(minimum(serverMinimum));

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("compares with the minimum for the app's own platform", async () => {
    Platform.OS = "android";
    answer(minimum(1, 9));

    await renderGate();

    expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
  });

  it("reads the build number the platform reports as a number", async () => {
    application.nativeBuildVersion = "12";
    answer(minimum(12));

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("does not block an app that cannot read its own build number", async () => {
    application.nativeBuildVersion = null;
    answer(minimum(99));

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("blocks with the maintenance screen while maintenance is on", async () => {
    answer(maintenance());

    await renderGate();

    expect(await screen.findByRole("heading", { name: "Down for maintenance" })).toBeOnTheScreen();
    expect(
      screen.getByText("Kalia is being maintained and will be back soon. Try again in a moment."),
    ).toBeOnTheScreen();
  });

  it("shows maintenance when both signals are on, since updating does not help", async () => {
    answer({ ...minimum(2), maintenance: true });

    await renderGate();

    expect(await screen.findByRole("heading", { name: "Down for maintenance" })).toBeOnTheScreen();
    expect(screen.queryByRole("heading", { name: "Update required" })).not.toBeOnTheScreen();
  });

  it("asks the server again on 'check again' and lets the app in once it says so", async () => {
    answer(maintenance());
    await renderGate();
    await fireEvent.press(await screen.findByRole("button", { name: "Check again" }));
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));

    answer(minimum(0));
    await fireEvent.press(await screen.findByRole("button", { name: "Check again" }));

    expect(await opened()).toBeOnTheScreen();
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it("stays on the screen when 'check again' reaches the server and it still says no", async () => {
    answer(minimum(2));
    await renderGate();

    await fireEvent.press(await screen.findByRole("button", { name: "Check again" }));

    await waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
  });

  it("lets the app open when the endpoint cannot be reached", async () => {
    unreachable();

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("lets the app open when the endpoint answers with an error status", async () => {
    transport.mockResolvedValue({ data: { title: "x" }, status: 500, headers: new Headers() });

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("keeps blocking offline on an update the server already demanded", async () => {
    answer(minimum(2));
    const first = await renderGate();
    await screen.findByRole("heading", { name: "Update required" });
    await waitFor(async () => expect(await AsyncStorage.getItem(MEMORY_KEY)).toBe("2"));
    await first.unmount();

    unreachable();
    await renderGate();

    expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
  });

  it("stops blocking offline once the app's build number meets the remembered minimum", async () => {
    await AsyncStorage.setItem(MEMORY_KEY, "2");
    application.nativeBuildVersion = "2";
    unreachable();

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("blocks on the remembered minimum while the server has not answered yet", async () => {
    await AsyncStorage.setItem(MEMORY_KEY, "3");
    let answerLate: (value: unknown) => void = () => {};
    transport.mockReturnValue(new Promise((resolve) => (answerLate = resolve)));

    await renderGate();

    expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
    answerLate({ data: minimum(0), status: 200, headers: new Headers() });
    expect(await opened()).toBeOnTheScreen();
  });

  it("remembers the minimum the server named, so a lowered minimum is released and forgotten", async () => {
    await AsyncStorage.setItem(MEMORY_KEY, "5");
    answer(minimum(1));

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
    await waitFor(async () => expect(await AsyncStorage.getItem(MEMORY_KEY)).toBe("1"));
  });

  it.each(["not a number", "-4", "2.5", ""])("ignores a remembered value that is %j", async (stored) => {
    await AsyncStorage.setItem(MEMORY_KEY, stored);
    unreachable();

    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  it("does not remember maintenance, which is the server's state and not the app's", async () => {
    answer(maintenance());
    const first = await renderGate();
    await screen.findByRole("heading", { name: "Down for maintenance" });
    await first.unmount();

    unreachable();
    await renderGate();

    expect(await opened()).toBeOnTheScreen();
  });

  describe("on returning to the foreground", () => {
    const background = () => act(() => focusManager.setFocused(false));
    const foreground = () => act(() => focusManager.setFocused(true));

    it("checks again once 30 seconds have passed and blocks if the minimum was raised", async () => {
      answer(minimum(0));
      await renderGate();
      await opened();
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now + 31_000);

      answer(minimum(2));
      await background();
      await foreground();

      expect(await screen.findByRole("heading", { name: "Update required" })).toBeOnTheScreen();
      expect(transport).toHaveBeenCalledTimes(2);
    });

    it("releases the app when the minimum was lowered meanwhile", async () => {
      answer(minimum(2));
      await renderGate();
      await screen.findByRole("heading", { name: "Update required" });
      const now = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(now + 31_000);

      answer(minimum(1));
      await background();
      await foreground();

      expect(await opened()).toBeOnTheScreen();
    });

    it("does not ask again within 30 seconds of the last answer", async () => {
      answer(minimum(0));
      await renderGate();
      await opened();

      await background();
      await foreground();

      expect(transport).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    [
      "en",
      { title: "Update required", body: "This version of Kalia is out of date. Update the app to continue." },
      { title: "Down for maintenance", body: "Kalia is being maintained and will be back soon. Try again in a moment." },
      "Check again",
    ],
    [
      "fi",
      { title: "Päivitys vaaditaan", body: "Tämä Kalian versio on vanhentunut. Päivitä sovellus jatkaaksesi." },
      { title: "Huoltotauko", body: "Kalia on huollettavana ja palaa pian käyttöön. Yritä hetken kuluttua uudelleen." },
      "Tarkista uudelleen",
    ],
  ] as const)("in %s", (locale, update, down, action) => {
    it.each([
      ["update", update, minimum(2)],
      ["maintenance", down, maintenance()],
    ] as const)("the %s screen reads as specified and labels its action", async (_, wording, config) => {
      answer(config);

      await renderGate(locale);

      expect(await screen.findByRole("heading", { name: wording.title })).toBeOnTheScreen();
      expect(screen.getByText(wording.body)).toBeOnTheScreen();
      const button = screen.getByRole("button", { name: action });
      expect(button.props.accessibilityLabel).toBe(action);
    });
  });
});
