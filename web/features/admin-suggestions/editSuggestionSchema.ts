import { z } from "zod";
import type { EditSuggestionRequest, SuggestionRow } from "./types";

// Each bound mirrors EditSuggestionRequestDto / NewBreweryRequestDto in the
// backend's catalog.web; the server stays the authority (ADR-0010).
export const MAX_NAME_LENGTH = 200;
export const MAX_CITY_LENGTH = 100;
const MAX_ABV = 100;

const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const NO_CONTROL_OR_INVISIBLE_CHARACTERS = /^[^\p{Cc}\p{Cf}]*$/u;
const ABV_FORMAT = /^\d{1,3}(?:[.,]\d+)?$/;
const ABV_ONE_DECIMAL = /^\d{1,3}(?:[.,]\d)?$/;

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

const checkName = (value: string, messages: { required: string; tooLong: string }): string | undefined => {
  if (value.trim() === "") return messages.required;
  if (value.trim().length > MAX_NAME_LENGTH) return messages.tooLong;
  if (!HAS_LETTER_OR_DIGIT.test(value)) return `${PREFIX}.nameNeedsLetter`;
  if (!NO_CONTROL_OR_INVISIBLE_CHARACTERS.test(value)) return `${PREFIX}.nameInvalid`;
  return undefined;
};

const toNumber = (abv: string): number => Number(abv.trim().replace(",", "."));

const checkAbv = (value: string): string | undefined => {
  const abv = value.trim();
  if (!ABV_FORMAT.test(abv) || toNumber(abv) > MAX_ABV) return `${PREFIX}.abvRange`;
  if (!ABV_ONE_DECIMAL.test(abv)) return `${PREFIX}.abvPrecision`;
  return undefined;
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
    const fail = (path: keyof EditSuggestionValues, message: string | undefined) => {
      if (message) context.addIssue({ code: "custom", path: [path], message });
    };

    fail("name", checkName(values.name, { required: `${PREFIX}.nameRequired`, tooLong: `${PREFIX}.nameTooLong` }));
    fail("style", values.style === "" ? `${PREFIX}.styleRequired` : undefined);
    fail("abv", checkAbv(values.abv));

    if (values.breweryMode === "new") {
      fail(
        "newBreweryName",
        checkName(values.newBreweryName, {
          required: `${PREFIX}.breweryNameRequired`,
          tooLong: `${PREFIX}.breweryNameTooLong`,
        }),
      );
      fail("newBreweryCountry", values.newBreweryCountry === "" ? `${PREFIX}.countryRequired` : undefined);
      fail(
        "newBreweryCity",
        values.newBreweryCity.trim().length > MAX_CITY_LENGTH
          ? `${PREFIX}.cityTooLong`
          : NO_CONTROL_OR_INVISIBLE_CHARACTERS.test(values.newBreweryCity)
            ? undefined
            : `${PREFIX}.cityInvalid`,
      );
    } else {
      fail("breweryId", values.breweryId === "" ? `${PREFIX}.breweryRequired` : undefined);
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

export const toEditRequest = (values: EditSuggestionValues): EditSuggestionRequest => {
  const beer = { name: values.name.trim(), style: values.style, abv: toNumber(values.abv) };
  if (values.breweryMode === "existing") {
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
