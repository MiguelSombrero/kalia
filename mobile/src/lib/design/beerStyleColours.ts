import { beerStyleGroup, enumLookup, type BeerStyleGroup } from "@kalia/api";
import { useColorScheme } from "react-native";
import { theme } from "./theme.generated";

export type StyleColours = { background: string; foreground: string };
type Mode = "light" | "dark";

const entriesFor = (mode: Mode): Record<BeerStyleGroup, StyleColours> => ({
  ...(Object.fromEntries(Object.entries(theme.variants["beer-style"]).map(([group, pair]) => [group, pair[mode]])) as Record<Exclude<BeerStyleGroup, "other">, StyleColours>),
  other: { background: theme.colors[mode].style, foreground: theme.colors[mode]["style-foreground"] },
});

const lookups = {
  light: enumLookup(entriesFor("light"), entriesFor("light").other),
  dark: enumLookup(entriesFor("dark"), entriesFor("dark").other),
};

export const coloursOfStyleGroup = (group: string | undefined, mode: Mode): StyleColours => lookups[mode](group);

export const useBeerStyleColours = () => {
  const mode: Mode = useColorScheme() === "dark" ? "dark" : "light";
  return (style: string) => coloursOfStyleGroup(beerStyleGroup(style), mode);
};
