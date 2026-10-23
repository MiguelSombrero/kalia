import { describe, expect, it } from "vitest";
import { similarlyNamed } from "./similarNames";

const beers = [
  { name: "Öö" },
  { name: "Öö Bourbon BA" },
  { name: "Virmalised" },
  { name: "Must Kuld" },
  { name: "Mõmmi" },
];

const names = (name: string) => similarlyNamed(name, beers).map((beer) => beer.name);

describe("similarlyNamed", () => {
  it("finds a name that the typed one contains, and one that contains it", () => {
    expect(names("Öö Bourbon")).toEqual(["Öö", "Öö Bourbon BA"]);
  });

  it("ignores case, spaces and punctuation, as the API's duplicate rule does", () => {
    expect(names("ÖÖ-bourbon")).toEqual(["Öö", "Öö Bourbon BA"]);
    expect(names("virmalised!")).toEqual(["Virmalised"]);
  });

  it("finds a name sharing a whole word", () => {
    expect(names("Kuld Reserve")).toEqual(["Must Kuld"]);
  });

  it("does not treat a shared letter or two as similar", () => {
    expect(names("Mõ")).toEqual(["Mõmmi"]);
    expect(names("M")).toEqual([]);
  });

  it("finds nothing for a name with no letters or digits", () => {
    expect(names("!!")).toEqual([]);
  });

  it("keeps at most five, in the order given", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ name: `Porter ${i}` }));

    expect(similarlyNamed("Porter", many).map((beer) => beer.name)).toEqual([
      "Porter 0",
      "Porter 1",
      "Porter 2",
      "Porter 3",
      "Porter 4",
    ]);
  });
});
