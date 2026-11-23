import { describe, expect, it } from "vitest";

import { type BeerFormFields, beerFormIssues, type BeerFormMessages, toBeerRequest } from "./beerForm";

const messages = Object.fromEntries(
  [
    "nameRequired", "nameTooLong", "nameNeedsLetter", "nameInvalid", "breweryRequired", "breweryNameRequired",
    "breweryNameTooLong", "countryRequired", "cityTooLong", "cityInvalid", "styleRequired", "abvRange", "abvPrecision",
  ].map((key) => [key, `test.${key}`]),
) as unknown as BeerFormMessages;

const valid: BeerFormFields = {
  name: "Öö Bourbon",
  style: "Imperial Stout",
  abv: "12,5",
  breweryId: "7f1c2a3b-0000-4000-8000-000000000001",
  newBreweryName: "",
  newBreweryCountry: "",
  newBreweryCity: "",
};

describe("beerFormIssues", () => {
  it("finds nothing wrong with a beer of a brewery the catalog has", () => {
    expect(beerFormIssues(valid, "existing", messages)).toEqual([]);
  });

  it("reads the new brewery's fields only when a new brewery is chosen", () => {
    const blankNewBrewery = { ...valid, breweryId: "" };
    expect(beerFormIssues(blankNewBrewery, "new", messages).map((issue) => issue.path)).toEqual([
      "newBreweryName",
      "newBreweryCountry",
    ]);
    expect(beerFormIssues(blankNewBrewery, "existing", messages)).toEqual([{ path: "breweryId", message: "test.breweryRequired" }]);
    expect(beerFormIssues(valid, "unset", messages)).toEqual([{ path: "breweryId", message: "test.breweryRequired" }]);
  });

  it("names each message its own caller supplied", () => {
    const issues = beerFormIssues({ ...valid, name: " ", style: "", abv: "101" }, "existing", messages);
    expect(issues.map((issue) => issue.message)).toEqual(["test.nameRequired", "test.styleRequired", "test.abvRange"]);
  });
});

describe("toBeerRequest", () => {
  it("sends the brewery's id, and the strength as a number", () => {
    expect(toBeerRequest(valid, "existing")).toEqual({ name: "Öö Bourbon", style: "Imperial Stout", abv: 12.5, breweryId: valid.breweryId });
  });

  it("sends a new brewery without an empty city", () => {
    const values = { ...valid, newBreweryName: " Ruosniemen Panimo ", newBreweryCountry: "FI", newBreweryCity: " " };
    expect(toBeerRequest(values, "new")).toEqual({
      name: "Öö Bourbon",
      style: "Imperial Stout",
      abv: 12.5,
      newBrewery: { name: "Ruosniemen Panimo", countryCode: "FI" },
    });
  });
});
