import { z } from "zod";

import { beerFormIssues, type BeerFormMessages, toBeerRequest } from "@/lib/beerForm";

import type { EditSuggestionRequest, SuggestionRow } from "./types";

export type BreweryMode = "new" | "existing";

export type EditSuggestionValues = {
  name: string;
  style: string;
  abv: string;
  breweryMode: BreweryMode;
  breweryId: string;
  newBreweryName: string;
  newBreweryCountry: string;
  newBreweryCity: string;
};

const PREFIX = "admin.review.edit.error";

const messages: BeerFormMessages = {
  nameRequired: `${PREFIX}.nameRequired`,
  nameTooLong: `${PREFIX}.nameTooLong`,
  nameNeedsLetter: `${PREFIX}.nameNeedsLetter`,
  nameInvalid: `${PREFIX}.nameInvalid`,
  breweryRequired: `${PREFIX}.breweryRequired`,
  breweryNameRequired: `${PREFIX}.breweryNameRequired`,
  breweryNameTooLong: `${PREFIX}.breweryNameTooLong`,
  countryRequired: `${PREFIX}.countryRequired`,
  cityTooLong: `${PREFIX}.cityTooLong`,
  cityInvalid: `${PREFIX}.cityInvalid`,
  styleRequired: `${PREFIX}.styleRequired`,
  abvRange: `${PREFIX}.abvRange`,
  abvPrecision: `${PREFIX}.abvPrecision`,
};

export const editSuggestionSchema = z
  .object({
    name: z.string(),
    style: z.string(),
    abv: z.string(),
    breweryMode: z.enum(["new", "existing"]),
    breweryId: z.string(),
    newBreweryName: z.string(),
    newBreweryCountry: z.string(),
    newBreweryCity: z.string(),
  })
  .superRefine((values, context) => {
    for (const { path, message } of beerFormIssues(values, values.breweryMode, messages)) {
      context.addIssue({ code: "custom", path: [path], message });
    }
  });

/** The suggestion as it stands, which is what the form starts from and what *Suggested* hints compare against. */
export const initialValues = (suggestion: SuggestionRow): EditSuggestionValues => ({
  name: suggestion.name,
  style: suggestion.style,
  abv: String(suggestion.abv),
  breweryMode: suggestion.breweryIsNew ? "new" : "existing",
  breweryId: suggestion.breweryIsNew ? "" : suggestion.brewery.id,
  newBreweryName: suggestion.breweryIsNew ? suggestion.brewery.name : "",
  newBreweryCountry: suggestion.breweryIsNew ? suggestion.brewery.countryCode : "",
  newBreweryCity: suggestion.breweryIsNew ? (suggestion.brewery.city ?? "") : "",
});

export const toEditRequest = (values: EditSuggestionValues): EditSuggestionRequest => toBeerRequest(values, values.breweryMode);
