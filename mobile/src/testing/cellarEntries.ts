export type BottleSpec = { container?: "BOTTLE" | "CAN" | "KEG"; brewed?: string; bestBefore?: string };

type Overrides = { id: string; name?: string; brewery?: string; style?: string; abv?: number; bestBefore?: (string | undefined)[]; bottles?: BottleSpec[]; withdrawn?: boolean };

export const entryOf = ({ id, name = `Beer ${id}`, brewery = `Brewery ${id}`, style = "IPA", abv = 5, bestBefore = [undefined], bottles, withdrawn = false }: Overrides) => {
  const specs: BottleSpec[] = bottles ?? bestBefore.map((date) => ({ bestBefore: date }));
  return {
    id,
    beer: { id: `beer-${id}`, name, brewery, style, abv },
    bottles: specs.map(({ container = "BOTTLE", brewed, bestBefore: date }, index) => ({
      id: `${id}-${index}`,
      entryId: id,
      containerType: container,
      ...(date ? { bestBeforeDate: date } : {}),
      ...(brewed ? { brewedDate: brewed } : {}),
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    })),
    quantity: specs.length,
    withdrawn,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
};
