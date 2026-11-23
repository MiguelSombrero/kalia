import { z } from "zod";

import { beerFormIssues, type BeerFormMessages, toBeerRequest } from "@/lib/beerForm";

import type { AddBeerRequest } from "./types";

export type BreweryMode = "unset" | "existing" | "new";

export type AddBeerFormValues = {
  name: string;
  breweryMode: BreweryMode;
  breweryId: string;
  newBreweryName: string;
  newBreweryCountry: string;
  newBreweryCity: string;
  style: string;
  abv: string;
};

const messages: BeerFormMessages = {
  nameRequired: "catalog.add.error.nameRequired",
  nameTooLong: "catalog.add.error.nameTooLong",
  nameNeedsLetter: "catalog.add.error.nameNeedsLetter",
  nameInvalid: "catalog.add.error.nameInvalid",
  breweryRequired: "catalog.add.error.breweryRequired",
  breweryNameRequired: "catalog.add.error.breweryNameRequired",
  breweryNameTooLong: "catalog.add.error.breweryNameTooLong",
  countryRequired: "catalog.add.error.countryRequired",
  cityTooLong: "catalog.add.error.cityTooLong",
  cityInvalid: "catalog.add.error.cityInvalid",
  styleRequired: "catalog.add.error.styleRequired",
  abvRange: "catalog.add.error.abvRange",
  abvPrecision: "catalog.add.error.abvPrecision",
};

export const addBeerSchema = z
  .object({
    name: z.string(),
    breweryMode: z.enum(["unset", "existing", "new"]),
    breweryId: z.string(),
    newBreweryName: z.string(),
    newBreweryCountry: z.string(),
    newBreweryCity: z.string(),
    style: z.string(),
    abv: z.string(),
  })
  .superRefine((values, context) => {
    for (const { path, message } of beerFormIssues(values, values.breweryMode, messages)) {
      context.addIssue({ code: "custom", path: [path], message });
    }
  });

export const toAddBeerRequest = (values: AddBeerFormValues): AddBeerRequest => toBeerRequest(values, values.breweryMode);
