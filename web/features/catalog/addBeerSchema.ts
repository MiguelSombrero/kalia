import { z } from "zod";
import type { AddBeerRequest } from "./types";

// Each bound mirrors AddBeerRequestDto / NewBreweryRequestDto in the backend's
// catalog.web; the server stays the authority (ADR-0010).
export const MAX_NAME_LENGTH = 200;
export const MAX_CITY_LENGTH = 100;
const MAX_ABV = 100;

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const NO_CONTROL_CHARACTERS = /^\P{Cc}*$/u;
const ABV_FORMAT = /^\d{1,3}(?:[.,]\d+)?$/;
const ABV_ONE_DECIMAL = /^\d{1,3}(?:[.,]\d)?$/;

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

type NameMessages = { required: string; tooLong: string };

const checkName = (value: string, messages: NameMessages): string | undefined => {
  if (value.trim() === "") return messages.required;
  if (value.trim().length > MAX_NAME_LENGTH) return messages.tooLong;
  if (!HAS_LETTER_OR_DIGIT.test(value)) return "catalog.add.error.nameNeedsLetter";
  if (!NO_CONTROL_CHARACTERS.test(value)) return "catalog.add.error.nameInvalid";
  return undefined;
};

const checkAbv = (value: string): string | undefined => {
  const abv = value.trim();
  if (!ABV_FORMAT.test(abv) || toNumber(abv) > MAX_ABV) return "catalog.add.error.abvRange";
  if (!ABV_ONE_DECIMAL.test(abv)) return "catalog.add.error.abvPrecision";
  return undefined;
};

const toNumber = (abv: string): number => Number(abv.trim().replace(",", "."));

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
    const fail = (path: keyof AddBeerFormValues, message: string | undefined) => {
      if (message) context.addIssue({ code: "custom", path: [path], message });
    };

    fail("name", checkName(values.name, {
      required: "catalog.add.error.nameRequired",
      tooLong: "catalog.add.error.nameTooLong",
    }));

    if (values.breweryMode === "new") {
      fail("newBreweryName", checkName(values.newBreweryName, {
        required: "catalog.add.error.breweryNameRequired",
        tooLong: "catalog.add.error.breweryNameTooLong",
      }));
      fail("newBreweryCountry", values.newBreweryCountry === "" ? "catalog.add.error.countryRequired" : undefined);
      fail("newBreweryCity", values.newBreweryCity.trim().length > MAX_CITY_LENGTH
        ? "catalog.add.error.cityTooLong"
        : NO_CONTROL_CHARACTERS.test(values.newBreweryCity) ? undefined : "catalog.add.error.cityInvalid");
    } else if (values.breweryMode === "unset" || values.breweryId === "") {
      fail("breweryId", "catalog.add.error.breweryRequired");
    }

    fail("style", values.style === "" ? "catalog.add.error.styleRequired" : undefined);
    fail("abv", checkAbv(values.abv));
  });

export const toAddBeerRequest = (values: AddBeerFormValues): AddBeerRequest => {
  const beer = { name: values.name.trim(), style: values.style, abv: toNumber(values.abv) };
  if (values.breweryMode !== "new") {
    return { ...beer, breweryId: values.breweryId };
  }
  const city = values.newBreweryCity.trim();
  return {
    ...beer,
    newBrewery: {
      name: values.newBreweryName.trim(),
      countryCode: values.newBreweryCountry,
      ...(city ? { city } : {}),
    },
  };
};
