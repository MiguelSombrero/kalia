import type { CellarEntry } from "./types";

type Container = "BOTTLE" | "CAN" | "KEG";
type Spec = string | undefined | { container?: Container; brewed?: string; bestBefore?: string };

const yearsBefore = (date: string, years: number) => `${Number(date.slice(0, 4)) - years}${date.slice(4)}`;

// A bottle given only a best-before date was brewed two years before it, so every bottle in the list has a vintage to show but the ones given none.
const bottle = (entryId: string, index: number, spec: Spec) => {
  const { container = "BOTTLE", bestBefore, brewed = bestBefore ? yearsBefore(bestBefore, 2) : undefined } = typeof spec === "object" ? spec : { bestBefore: spec };
  return {
    id: `${entryId}-bottle-${index}`,
    entryId,
    containerType: container,
    ...(bestBefore ? { bestBeforeDate: bestBefore } : {}),
    ...(brewed ? { brewedDate: brewed } : {}),
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
};

const entry = (id: string, name: string, brewery: string, style: string, abv: number, specs: Spec[], withdrawn = false): CellarEntry => ({
  id,
  beer: { id: `beer-${id}`, name, brewery, style, abv },
  bottles: specs.map((spec, index) => bottle(id, index, spec)),
  quantity: specs.length,
  withdrawn,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const times = (count: number, spec?: Spec) => Array.from({ length: count }, () => spec);

export const sampleCellar: CellarEntry[] = [
  entry("1", "Aamunkoi Hefeweizen", "Pohjanranta Panimo", "Hefeweizen", 5.2, ["2027-01-15"]),
  entry("2", "Barrel No. 7", "Kallio Barrel Works", "Imperial Stout", 12.5, [...times(3, "2031-05-01"), undefined]),
  entry("3", "Harmaa Hylje", "Saaristomeren Käsityöpanimo", "Baltic Porter", 7.2, ["2026-09-30", "2026-09-30", ...times(4, "2027-03-31")]),
  entry("4", "Pohjoisen Pitkän Pimeän Kauden Kaakaokauraolut", "Itäisen Saaristomeren Käsityöpanimoyhtiö", "Oatmeal Stout", 9, [
    ...times(6, { brewed: "2024-03-10", bestBefore: "2027-03-10" }),
    ...times(4, { brewed: "2023-02-14", bestBefore: "2026-02-14" }),
    { brewed: "2023-02-14", bestBefore: "2026-11-23" },
    ...times(3, { container: "CAN", brewed: "2025-09-01", bestBefore: "2028-09-01" }),
    ...times(2, { container: "CAN", brewed: "2022-11-05", bestBefore: "2026-05-05" }),
    ...times(2, { brewed: "2021-12-01" }),
    ...times(3),
    { container: "KEG", brewed: "2025-01-20", bestBefore: "2027-01-20" },
    ...times(2, { container: "CAN", bestBefore: "2027-08-01" }),
  ]),
  entry("5", "Hazy Hopfen Hoax", "Kolmas Linja", "New England IPA", 6.5, times(3, "2026-12-15")),
  entry("6", "Ruostunut Ankkuri", "Satama Panimo", "Double IPA", 8.4, ["2026-11-01"]),
  entry("7", "Kuiva Karhu", "Kallio Barrel Works", "Pilsner", 4.6, times(12, "2027-06-30")),
  entry("8", "Saison de la Rivière", "Brasserie du Val", "Saison", 6, ["2028-01-01", "2028-01-01", undefined]),
  entry("9", "Oude Geuze Zuiderpoort", "Brouwerij Zuiderpoort", "Gueuze", 6, times(2, "2035-01-01")),
  entry("10", "Tripel Dorée", "Abdij Sint-Clemens", "Tripel", 9, times(2, "2029-04-01")),
  entry("11", "Old Foghorn Barleywine", "Harbour & Hops", "Barleywine", 10, ["2032-10-01", "2032-10-01", "2033-10-01"]),
  entry("12", "Ruis Pale Ale", "Pohjanranta Panimo", "Pale Ale", 5, times(2, "2027-02-10")),
  entry("13", "Lichtenhainer Ilta", "Savuinen Sali", "Lichtenhainer", 3.8, ["2026-12-31"]),
  entry("14", "Pohjoisen Tähti Dubbel", "Klosteri Pohjola", "Dubbel", 7, times(2, "2028-05-01"), true),
  entry("15", "Mild Mannered Brown", "Satama Panimo", "Brown Ale", 4.1, times(2, "2027-04-01")),
  entry("16", "Schwarzbier Nacht", "Münchner Hof", "Schwarzbier", 4.9, times(2)),
  entry("17", "Kriek Mariage", "Brouwerij Zuiderpoort", "Kriek", 5.5, ["2026-12-01", "2027-12-01"]),
];
