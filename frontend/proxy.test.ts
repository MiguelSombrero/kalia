import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

const matches = (url: string): boolean => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it.each(["/", "/beers", "/cellar", "/cellars/olutharrastaja_88", "/apple-icons", "/iconic"])(
    "sends %s through the locale redirect",
    (url) => {
      expect(matches(url)).toBe(true);
    },
  );

  it.each(["/icon.svg", "/icon1", "/apple-icon", "/_next/static/chunk.js", "/api/auth/session", "/robots.txt"])(
    "leaves %s alone",
    (url) => {
      expect(matches(url)).toBe(false);
    },
  );
});
