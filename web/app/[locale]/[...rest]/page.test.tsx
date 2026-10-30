import { describe, expect, it } from "vitest";
import NoSuchPage from "./page";

describe("NoSuchPage", () => {
  it("raises the locale's own not-found, so a mistyped URL is framed by the shell", () => {
    expect(() => NoSuchPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});
