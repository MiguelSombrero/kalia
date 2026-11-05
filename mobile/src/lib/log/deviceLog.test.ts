import { logError, scrub } from "./deviceLog";

describe("scrub", () => {
  it.each([
    ["a URL's query string", "failed https://api.test/api/v1/beers?q=ipa&token=abc now", "failed https://api.test/api/v1/beers now"],
    ["a path's query string", "GET /api/v1/profile?user=jouni failed", "GET /api/v1/profile failed"],
    ["a build machine's absolute path", "at CellarScreen (/Users/someone/Library/Build/Release-iphonesimulator/main.jsbundle:119040:22)", "at CellarScreen (main.jsbundle:119040:22)"],
    ["a bearer token", "rejected Bearer abc.def", "rejected Bearer [removed]"],
    ["a JWT", "bad token eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln here", "bad token [removed] here"],
    ["text with nothing to remove", "Undefined is not a function", "Undefined is not a function"],
  ])("removes %s", (_, text, expected) => {
    expect(scrub(text)).toBe(expected);
  });
});

describe("logError", () => {
  const devFlag = globalThis as { __DEV__?: boolean };
  const original = devFlag.__DEV__;

  afterEach(() => {
    devFlag.__DEV__ = original;
    jest.restoreAllMocks();
  });

  it("writes one JSON line carrying the level, the message and the fields", () => {
    devFlag.__DEV__ = false;
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);

    logError("Something broke", { status: 500, traceId: undefined });

    expect(error).toHaveBeenCalledWith('{"level":"error","message":"Something broke","status":500}');
  });
});
