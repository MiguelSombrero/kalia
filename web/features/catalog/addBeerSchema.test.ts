import { describe, expect, it } from "vitest";
import { type AddBeerFormValues, addBeerSchema, toAddBeerRequest } from "./addBeerSchema";

const valid: AddBeerFormValues = {
  name: "Öö Bourbon",
  breweryMode: "existing",
  breweryId: "7f1c2a3b-0000-4000-8000-000000000001",
  newBreweryName: "",
  newBreweryCountry: "",
  newBreweryCity: "",
  style: "Imperial Stout",
  abv: "12.5",
};

const errorsOf = (values: AddBeerFormValues): Record<string, string> => {
  const result = addBeerSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("addBeerSchema", () => {
  it("accepts a beer with a brewery the catalog has", () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it("accepts a beer with a new brewery, its city left out", () => {
    expect(
      errorsOf({
        ...valid,
        breweryMode: "new",
        breweryId: "",
        newBreweryName: "Ruosniemen Panimo",
        newBreweryCountry: "FI",
      }),
    ).toEqual({});
  });

  // Mirrors AddBeerRequestDto.name: @NotBlank @Size(max = 200), a letter or
  // digit, no control characters.
  it.each([
    ["", "catalog.add.error.nameRequired"],
    ["   ", "catalog.add.error.nameRequired"],
    ["x".repeat(201), "catalog.add.error.nameTooLong"],
    ["!!!", "catalog.add.error.nameNeedsLetter"],
    ["Öö\u0007", "catalog.add.error.nameInvalid"],
  ])("refuses the name %j", (name, message) => {
    expect(errorsOf({ ...valid, name })).toEqual({ name: message });
  });

  it("allows a name of exactly 200 characters", () => {
    expect(errorsOf({ ...valid, name: "x".repeat(200) })).toEqual({});
  });

  it("measures a name and a city as they are sent, without surrounding spaces", () => {
    expect(
      errorsOf({
        ...valid,
        name: `${"a".repeat(200)}  `,
        breweryMode: "new",
        breweryId: "",
        newBreweryName: `  ${"b".repeat(200)}`,
        newBreweryCountry: "FI",
        newBreweryCity: `${"c".repeat(100)} `,
      }),
    ).toEqual({});
  });

  it("asks for a brewery when none is chosen", () => {
    expect(errorsOf({ ...valid, breweryMode: "unset", breweryId: "" })).toEqual({
      breweryId: "catalog.add.error.breweryRequired",
    });
  });

  // Mirrors NewBreweryRequestDto: name as a beer's, a listed country, a city
  // of at most 100 characters.
  it("holds a new brewery to the same rules the API does", () => {
    expect(
      errorsOf({
        ...valid,
        breweryMode: "new",
        breweryId: "",
        newBreweryName: " ",
        newBreweryCountry: "",
        newBreweryCity: "x".repeat(101),
      }),
    ).toEqual({
      newBreweryName: "catalog.add.error.breweryNameRequired",
      newBreweryCountry: "catalog.add.error.countryRequired",
      newBreweryCity: "catalog.add.error.cityTooLong",
    });
  });

  it("asks for a style", () => {
    expect(errorsOf({ ...valid, style: "" })).toEqual({ style: "catalog.add.error.styleRequired" });
  });

  // Mirrors AddBeerRequestDto.abv: @DecimalMin("0") @DecimalMax("100"),
  // @Digits(fraction = 1).
  it.each([
    ["", "catalog.add.error.abvRange"],
    ["strong", "catalog.add.error.abvRange"],
    ["100.1", "catalog.add.error.abvRange"],
    ["-1", "catalog.add.error.abvRange"],
    ["12.55", "catalog.add.error.abvPrecision"],
  ])("refuses the strength %j", (abv, message) => {
    expect(errorsOf({ ...valid, abv })).toEqual({ abv: message });
  });

  it.each(["0", "100", "12,5", " 6.5 ", "5"])("accepts the strength %j", (abv) => {
    expect(errorsOf({ ...valid, abv })).toEqual({});
  });
});

describe("toAddBeerRequest", () => {
  it("sends an existing brewery by id and nothing of a new one", () => {
    expect(toAddBeerRequest({ ...valid, name: "  Öö Bourbon ", abv: "12,5", newBreweryName: "left over" })).toEqual({
      name: "Öö Bourbon",
      style: "Imperial Stout",
      abv: 12.5,
      breweryId: valid.breweryId,
    });
  });

  it("sends a new brewery with its country, and its city only when given", () => {
    const newBrewery = { ...valid, breweryMode: "new" as const, newBreweryName: "Ruosniemen Panimo", newBreweryCountry: "FI" };

    expect(toAddBeerRequest({ ...newBrewery, newBreweryCity: " " })).toEqual({
      name: "Öö Bourbon",
      style: "Imperial Stout",
      abv: 12.5,
      newBrewery: { name: "Ruosniemen Panimo", countryCode: "FI" },
    });
    expect(toAddBeerRequest({ ...newBrewery, newBreweryCity: "Pori" }).newBrewery).toEqual({
      name: "Ruosniemen Panimo",
      countryCode: "FI",
      city: "Pori",
    });
  });
});
