import { beerStyleGroups } from "@kalia/api";
import { coloursOfStyleGroup } from "./beerStyleColours";
import { contrastRatio } from "./contrast";
import { theme } from "./theme.generated";

describe("coloursOfStyleGroup", () => {
  it("has a token pair for every group the mapping can answer, and for no other", () => {
    expect(Object.keys(theme.variants["beer-style"]).sort()).toEqual(beerStyleGroups.filter((group) => group !== "other").sort());
  });

  it.each(["unlisted-group", "", undefined])("answers the neutral pair for a group this build does not list: %p", (group) => {
    const colours = coloursOfStyleGroup(group, "light");

    expect(colours).toEqual({ background: theme.colors.light.style, foreground: theme.colors.light["style-foreground"] });
    expect(contrastRatio(colours.foreground, colours.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("answers a listed group its own pair", () => {
    expect(coloursOfStyleGroup("stout", "light")).toEqual(theme.variants["beer-style"].stout.light);
  });

  it("answers each mode its own pair, and the neutral pair of the mode asked for", () => {
    expect(coloursOfStyleGroup("stout", "dark")).toEqual(theme.variants["beer-style"].stout.dark);
    expect(coloursOfStyleGroup(undefined, "dark")).toEqual({ background: theme.colors.dark.style, foreground: theme.colors.dark["style-foreground"] });
  });

  it("carries every group's colour unchanged from light to dark, so a style looks the same in either mode", () => {
    for (const pair of Object.values(theme.variants["beer-style"])) expect(pair.dark).toEqual(pair.light);
  });
});
