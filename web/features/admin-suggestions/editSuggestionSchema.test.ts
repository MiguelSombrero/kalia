import { describe, expect, it } from "vitest";
import { editSuggestionSchema, initialValues, toEditRequest, type EditSuggestionValues } from "./editSuggestionSchema";
import type { SuggestionRow } from "./types";

const valid: EditSuggestionValues = {
  name: "Öö Imperial Baltic Porter",
  style: "Baltic Porter",
  abv: "10,5",
  breweryMode: "existing",
  breweryId: "b-pohjala",
  newBreweryName: "",
  newBreweryCountry: "",
  newBreweryCity: "",
};

const messages = (values: Partial<EditSuggestionValues>) => {
  const result = editSuggestionSchema.safeParse({ ...valid, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

describe("editSuggestionSchema", () => {
  it("accepts the values of a suggestion as it stands", () => {
    expect(messages({})).toEqual([]);
  });

  it.each([
    [{ name: "  " }, "name: admin.review.edit.error.nameRequired"],
    [{ name: "x".repeat(201) }, "name: admin.review.edit.error.nameTooLong"],
    [{ name: "---" }, "name: admin.review.edit.error.nameNeedsLetter"],
    [{ name: "Öö​Porter" }, "name: admin.review.edit.error.nameInvalid"],
    [{ style: "" }, "style: admin.review.edit.error.styleRequired"],
    [{ abv: "100,5" }, "abv: admin.review.edit.error.abvRange"],
    [{ abv: "abc" }, "abv: admin.review.edit.error.abvRange"],
    [{ abv: "10.55" }, "abv: admin.review.edit.error.abvPrecision"],
    [{ breweryId: "" }, "breweryId: admin.review.edit.error.breweryRequired"],
  ] satisfies [Partial<EditSuggestionValues>, string][])("refuses %j as the add path would", (values, message) => {
    expect(messages(values)).toContain(message);
  });

  it("holds a new brewery to a name, a country and a bounded city", () => {
    const fresh = { breweryMode: "new" as const, breweryId: "" };

    expect(messages({ ...fresh, newBreweryName: "", newBreweryCountry: "", newBreweryCity: "" })).toEqual([
      "newBreweryName: admin.review.edit.error.breweryNameRequired",
      "newBreweryCountry: admin.review.edit.error.countryRequired",
    ]);
    expect(messages({ ...fresh, newBreweryName: "Löyly", newBreweryCountry: "FI", newBreweryCity: "x".repeat(101) })).toEqual([
      "newBreweryCity: admin.review.edit.error.cityTooLong",
    ]);
  });
});

describe("toEditRequest", () => {
  it("names an existing brewery by its id and reads a decimal comma", () => {
    expect(toEditRequest(valid)).toEqual({ name: "Öö Imperial Baltic Porter", style: "Baltic Porter", abv: 10.5, breweryId: "b-pohjala" });
  });

  it("sends the new brewery's fields, and no city when none is given", () => {
    expect(
      toEditRequest({ ...valid, breweryMode: "new", breweryId: "", newBreweryName: " Löyly ", newBreweryCountry: "FI", newBreweryCity: " " }),
    ).toEqual({ name: "Öö Imperial Baltic Porter", style: "Baltic Porter", abv: 10.5, newBrewery: { name: "Löyly", countryCode: "FI" } });
  });
});

describe("initialValues", () => {
  const row = (breweryIsNew: boolean): SuggestionRow => ({
    id: "s1",
    name: "Hazy Hammer",
    style: "New England IPA",
    abv: 6.2,
    brewery: { id: "b1", name: "Sahalahti Brewing Co.", countryCode: "FI", city: "Sahalahti", place: "Sahalahti, Finland" },
    breweryIsNew,
    pendingCount: 1,
    rejectedCount: 0,
    suggestedAt: "2026-11-01T16:00:00Z",
    waited: "5 days ago",
  });

  it("starts a suggestion with a new brewery on its own fields, and one with an existing brewery on its id", () => {
    expect(initialValues(row(true))).toMatchObject({ breweryMode: "new", breweryId: "", newBreweryName: "Sahalahti Brewing Co.", newBreweryCountry: "FI" });
    expect(initialValues(row(false))).toMatchObject({ breweryMode: "existing", breweryId: "b1", newBreweryName: "" });
  });
});
