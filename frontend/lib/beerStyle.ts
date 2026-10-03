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
  ["wheat", ["weizen", "weisse", "weiss", "wheat", "wit", "hefe"]],
  ["stout", ["stout"]],
  ["porter", ["porter"]],
  ["belgian-dark", ["dubbel", "quad", "belgian strong dark", "belgian dark"]],
  ["belgian-light", ["tripel", "saison", "belgian"]],
  ["strong-ale", ["barleywine", "barley wine", "old ale", "wee heavy", "scotch ale", "strong ale"]],
  ["light-lager", ["maibock", "helles"]],
  ["brown-lager", ["dunkel", "bock", "schwarz", "dark lager", "märzen", "marzen", "oktoberfest", "rauch", "amber lager", "vienna", "red lager"]],
  ["light-lager", ["pils", "lager", "kölsch", "kolsch", "export"]],
  ["english-ale", ["esb", "extra special", "bitter", "mild", "brown ale", "english", "scottish", "amber", "red ale"]],
  ["pale-ale", ["pale ale", "session ale", "golden ale", "blonde ale", "blond ale", "summer ale"]],
];

export const beerStyleGroup = (style: string): BeerStyleGroup => {
  const name = style.trim().toLowerCase();
  return rules.find(([, words]) => words.some((word) => name.includes(word)))?.[0] ?? "other";
};
