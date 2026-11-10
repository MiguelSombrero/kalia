export const beerStyleGroups = [
  "stout",
  "porter",
  "brown-lager",
  "light-lager",
  "wheat",
  "belgian-light",
  "belgian-dark",
  "ipa",
  "pale-ale",
  "english-ale",
  "strong-ale",
  "sour",
  "other",
] as const;

export type BeerStyleGroup = (typeof beerStyleGroups)[number];

// First match wins; beerStyle.test.ts pins the cases the order decides.
const rules: readonly (readonly [BeerStyleGroup, readonly string[]])[] = [
  ["ipa", ["ipa", "india pale"]],
  ["sour", ["sour", "lambic", "gueuze", "geuze", "kriek", "framboise", "wild", "gose", "berliner", "flanders", "oud bruin"]],
  ["strong-ale", ["wheatwine"]],
  ["wheat", ["weizen", "weisse", "weiss", "wheat", "wit", "hefe"]],
  ["stout", ["stout"]],
  ["porter", ["porter"]],
  ["belgian-dark", ["dubbel", "quad", "belgian strong dark", "belgian dark"]],
  ["belgian-light", ["tripel", "saison", "belgian", "champagne", "farmhouse"]],
  ["strong-ale", ["barleywine", "barley wine", "old ale", "wee heavy", "scotch ale", "strong ale", "winter warmer", "adambier"]],
  ["light-lager", ["maibock", "helles"]],
  ["brown-lager", ["dunkel", "bock", "schwarz", "dark lager", "märzen", "marzen", "oktoberfest", "rauch", "amber lager", "vienna", "red lager", "smoked", "steam"]],
  ["light-lager", ["pils", "lager", "kölsch", "kolsch", "export", "ice beer", "rice beer", "light beer", "zwickel"]],
  ["english-ale", ["esb", "extra special", "bitter", "mild", "brown ale", "english", "scottish", "amber", "red ale", "altbier", "pumpkin", "bière de garde", "biere de garde"]],
  ["pale-ale", ["pale ale", "session ale", "golden ale", "blonde ale", "blond ale", "summer ale", "cream ale"]],
  ["sour", ["fruit", "brett", "faro"]],
];

export const beerStyleGroup = (style: string): BeerStyleGroup => {
  const name = style.trim().toLowerCase();
  return rules.find(([, words]) => words.some((word) => name.includes(word)))?.[0] ?? "other";
};
