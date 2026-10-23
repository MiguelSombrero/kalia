import { describe, expect, it } from "vitest";
import { beerHref, catalogHref, cellarHref, ownCellarHref, shareableCellarHref } from "./routes";

describe("routes", () => {
  it("puts the locale first on every in-app address", () => {
    expect(catalogHref("fi")).toBe("/fi/beers");
    expect(beerHref("fi", "b1")).toBe("/fi/beers/b1");
    expect(cellarHref("fi", "ada")).toBe("/fi/cellars/ada");
    expect(ownCellarHref("fi")).toBe("/fi/cellar");
  });

  it("appends a query only when it has something in it", () => {
    expect(catalogHref("en", new URLSearchParams({ query: "ipa" }))).toBe("/en/beers?query=ipa");
    expect(beerHref("en", "b1", new URLSearchParams({ sort: "abv,desc" }))).toBe("/en/beers/b1?sort=abv%2Cdesc");
    expect(catalogHref("en", new URLSearchParams())).toBe("/en/beers");
  });

  it("keeps the shareable cellar address locale-less", () => {
    expect(shareableCellarHref("ada")).toBe("/cellars/ada");
  });

  it("encodes a path segment rather than letting it add one", () => {
    expect(cellarHref("en", "a/b")).toBe("/en/cellars/a%2Fb");
    expect(shareableCellarHref("a?b")).toBe("/cellars/a%3Fb");
  });
});
