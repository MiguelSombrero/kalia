import { beerStyleGroups } from "@kalia/api";
import { coloursOfStyleGroup } from "./beerStyleColours";
import { theme } from "./theme.generated";

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

describe("coloursOfStyleGroup", () => {
  it("has a token pair for every group the mapping can answer, and for no other", () => {
    expect(Object.keys(theme.variants["beer-style"]).sort()).toEqual(beerStyleGroups.filter((group) => group !== "other").sort());
  });

  it.each(["unlisted-group", "", undefined])("answers the neutral pair for a group this build does not list: %p", (group) => {
    const colours = coloursOfStyleGroup(group, "light");

    expect(colours).toEqual({ background: theme.colors.light.style, foreground: theme.colors.light["style-foreground"] });
    expect(contrast(colours.foreground, colours.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("answers a listed group its own pair", () => {
    expect(coloursOfStyleGroup("stout", "light")).toEqual(theme.variants["beer-style"].stout.light);
  });
});
