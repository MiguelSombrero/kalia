type Overrides = { id: string; name?: string; brewery?: string; style?: string; abv?: number; bestBefore?: (string | undefined)[]; withdrawn?: boolean };

export const entryOf = ({ id, name = `Beer ${id}`, brewery = `Brewery ${id}`, style = "IPA", abv = 5, bestBefore = [undefined], withdrawn = false }: Overrides) => ({
  id,
  beer: { id: `beer-${id}`, name, brewery, style, abv },
  bottles: bestBefore.map((date, index) => ({
    id: `${id}-${index}`,
    entryId: id,
    containerType: "BOTTLE" as const,
    ...(date ? { bestBeforeDate: date } : {}),
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  })),
  quantity: bestBefore.length,
  withdrawn,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
