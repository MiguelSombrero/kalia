import { act, fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { apiError } from "@kalia/api";
import { CrashBoundary } from "./CrashBoundary";
import { UncaughtErrorGate } from "./UncaughtErrorGate";
import { clearUncaughtError, installUncaughtErrorHandler, showUncaughtError } from "./uncaughtError";

jest.mock("expo-application", () => ({ nativeApplicationVersion: "0.1.0", nativeBuildVersion: "26569207" }));
jest.mock("expo-localization", () => ({ useLocales: jest.fn() }));
const localization = jest.requireMock<{ useLocales: jest.Mock }>("expo-localization");

const HOME = ["", "Users", "someone"].join("/");
const TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJqb3VuaSJ9.c2lnbmF0dXJl";

let broken = true;
let failure: Error;
const Screen = () => {
  if (broken) {
    throw failure;
  }
  return <Text role="heading">Home</Text>;
};

const Layout = () => (
  <UncaughtErrorGate>
    <Screen />
  </UncaughtErrorGate>
);

const renderApp = () =>
  renderRouter({ _layout: { default: Layout, ErrorBoundary: CrashBoundary }, index: Screen }, { initialUrl: "/" });

const speak = (languageCode: string) => localization.useLocales.mockReturnValue([{ languageCode }]);

let error: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
  broken = true;
  failure = new TypeError(`undefined is not a function (reading https://api.test/x?token=${TOKEN})`);
  speak("en");
  clearUncaughtError();
  // React logs a caught render error itself; the lines under test are Kalia's.
  error = jest.spyOn(console, "error").mockImplementation(() => undefined);
  warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

const kaliaLines = () =>
  [...error.mock.calls, ...warn.mock.calls]
    .map(([line]) => line)
    .filter((line): line is string => typeof line === "string" && line.startsWith('{"level"'))
    .map((line) => JSON.parse(line));

describe("an error thrown inside a screen", () => {
  it.each([
    ["en", "Something went wrong", "Restart Kalia", "Version 0.1.0, build 26569207"],
    ["fi", "Jokin meni pieleen", "Käynnistä Kalia uudelleen", "Versio 0.1.0, koontinumero 26569207"],
  ] as const)("shows the restart screen with the build number, in %s", async (locale, title, restart, build) => {
    speak(locale);

    await renderApp();

    expect(screen.getByRole("heading", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: restart })).toBeOnTheScreen();
    expect(screen.getByText(build)).toBeOnTheScreen();
  });

  it("renders the app again when the user restarts", async () => {
    await renderApp();
    broken = false;

    await fireEvent.press(screen.getByRole("button", { name: "Restart Kalia" }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeOnTheScreen();
    expect(screen.queryByText("Something went wrong")).not.toBeOnTheScreen();
  });

  it("logs one line naming the error, with no query string or token", async () => {
    await renderApp();

    const [line, ...rest] = kaliaLines();
    expect(rest).toEqual([]);
    expect(line).toMatchObject({ level: "error", message: "Uncaught error", source: "render", name: "TypeError" });
    expect(JSON.stringify(line)).not.toMatch(/eyJ|\?token|jouni/);
  });

  it("keeps its line short enough for the device log, which truncates at about 1 KB", async () => {
    failure = new Error("x".repeat(5000));
    failure.stack = Array.from({ length: 40 }, (_, i) => `    at frame${i} (${HOME}/Library/Build/main.jsbundle:${i}:1)`).join("\n");

    await renderApp();

    const line = (error.mock.calls.concat(warn.mock.calls) as string[][]).map(([l]) => l).find((l) => l.startsWith('{"level"'));
    expect(line!.length).toBeLessThan(1000);
    expect(line).not.toContain("someone");
  });

  it("names the trace id when a failed request caused it, on screen and in the log", async () => {
    failure = apiError("network", "Could not reach the backend for /api/v1/beers", {
      traceId: "0af7651916cd43dd8448eb211c80319c",
    });

    await renderApp();

    expect(screen.getByText("Reference: 0af7651916cd43dd8448eb211c80319c")).toBeOnTheScreen();
    expect(kaliaLines()[0]).toMatchObject({ traceId: "0af7651916cd43dd8448eb211c80319c" });
  });

  it("shows the scrubbed message in a development build only", async () => {
    await renderApp();
    expect(screen.getByText("undefined is not a function (reading https://api.test/x)")).toBeOnTheScreen();
  });

  it("puts nothing of the user on the screen but the error's own trace", async () => {
    await renderApp();

    expect(screen.queryByText(/jouni|eyJ|token/)).not.toBeOnTheScreen();
  });
});

describe("an error thrown outside rendering", () => {
  const original = (globalThis as { __DEV__?: boolean }).__DEV__;
  const setDev = (value: boolean | undefined) => ((globalThis as { __DEV__?: boolean }).__DEV__ = value);

  afterEach(() => setDev(original));

  const install = () => {
    const previous = jest.fn();
    let handler: (error: unknown, isFatal?: boolean) => void = previous;
    installUncaughtErrorHandler({
      getGlobalHandler: () => previous,
      setGlobalHandler: (next) => {
        handler = next;
      },
    });
    return { previous, throwFatal: (thrown: unknown, isFatal = true) => handler(thrown, isFatal) };
  };

  it("shows the restart screen in place of the app and restarts into it", async () => {
    setDev(false);
    broken = false;
    const { previous, throwFatal } = install();
    await renderApp();

    await act(async () => throwFatal(failure));

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeOnTheScreen();
    expect(screen.getByText("Version 0.1.0, build 26569207")).toBeOnTheScreen();
    expect(previous).not.toHaveBeenCalled();
    expect(kaliaLines()).toEqual([expect.objectContaining({ source: "global", name: "TypeError" })]);
    expect(JSON.stringify(kaliaLines())).not.toMatch(/eyJ|\?token/);

    await fireEvent.press(screen.getByRole("button", { name: "Restart Kalia" }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeOnTheScreen();
  });

  it("shows it for a thrown value that is not an Error", async () => {
    setDev(false);
    broken = false;
    const { throwFatal } = install();
    await renderApp();

    await act(async () => throwFatal("boom"));

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeOnTheScreen();
  });

  it.each([
    ["a non-fatal error", false, false],
    ["any error in a development build", true, true],
  ] as const)("leaves %s to React Native's own handler", (_, isFatal, dev) => {
    setDev(dev);
    const { previous, throwFatal } = install();

    throwFatal(failure, isFatal);

    expect(previous).toHaveBeenCalledWith(failure, isFatal);
    expect(kaliaLines()).toEqual([]);
  });

  it("can be set from anywhere in the app", async () => {
    broken = false;
    await renderApp();

    await act(async () => showUncaughtError(new Error("late")));

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeOnTheScreen();
  });
});
