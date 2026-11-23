import {
  ABV_FORMAT,
  ABV_ONE_DECIMAL,
  HAS_LETTER_OR_DIGIT,
  MAX_ABV,
  MAX_BEER_NAME_LENGTH,
  MAX_BREWERY_NAME_LENGTH,
  MAX_CITY_LENGTH,
  NO_CONTROL_OR_INVISIBLE_CHARACTERS,
} from "@kalia/api/bounds";

import type { TranslationKey } from "@/i18n/translationKey";

export type BeerFormFields = {
  name: string;
  style: string;
  abv: string;
  breweryId: string;
  newBreweryName: string;
  newBreweryCountry: string;
  newBreweryCity: string;
};

export type BeerFormMessages = Record<
  | "nameRequired"
  | "nameTooLong"
  | "nameNeedsLetter"
  | "nameInvalid"
  | "breweryRequired"
  | "breweryNameRequired"
  | "breweryNameTooLong"
  | "countryRequired"
  | "cityTooLong"
  | "cityInvalid"
  | "styleRequired"
  | "abvRange"
  | "abvPrecision",
  TranslationKey
>;

export type BeerFormIssue = { path: keyof BeerFormFields; message: TranslationKey };

export const toNumber = (abv: string): number => Number(abv.trim().replace(",", "."));

type NameMessages = { required: TranslationKey; tooLong: TranslationKey; needsLetter: TranslationKey; invalid: TranslationKey };

const checkName = (value: string, maxLength: number, messages: NameMessages): TranslationKey | undefined => {
  if (value.trim() === "") return messages.required;
  if (value.trim().length > maxLength) return messages.tooLong;
  if (!HAS_LETTER_OR_DIGIT.test(value)) return messages.needsLetter;
  if (!NO_CONTROL_OR_INVISIBLE_CHARACTERS.test(value)) return messages.invalid;
  return undefined;
};

const checkAbv = (value: string, messages: BeerFormMessages): TranslationKey | undefined => {
  const abv = value.trim();
  if (!ABV_FORMAT.test(abv) || toNumber(abv) > MAX_ABV) return messages.abvRange;
  if (!ABV_ONE_DECIMAL.test(abv)) return messages.abvPrecision;
  return undefined;
};

const checkCity = (value: string, messages: BeerFormMessages): TranslationKey | undefined => {
  if (value.trim().length > MAX_CITY_LENGTH) return messages.cityTooLong;
  return NO_CONTROL_OR_INVISIBLE_CHARACTERS.test(value) ? undefined : messages.cityInvalid;
};

/**
 * What the add-beer and edit-suggestion forms both refuse. `"unset"` is the
 * add form's state before a brewery choice is made.
 */
export const beerFormIssues = (
  values: BeerFormFields,
  brewery: "new" | "existing" | "unset",
  messages: BeerFormMessages,
): BeerFormIssue[] => {
  const found: BeerFormIssue[] = [];
  const fail = (path: keyof BeerFormFields, message: TranslationKey | undefined) => {
    if (message) found.push({ path, message });
  };

  fail(
    "name",
    checkName(values.name, MAX_BEER_NAME_LENGTH, {
      required: messages.nameRequired,
      tooLong: messages.nameTooLong,
      needsLetter: messages.nameNeedsLetter,
      invalid: messages.nameInvalid,
    }),
  );

  if (brewery === "new") {
    fail(
      "newBreweryName",
      checkName(values.newBreweryName, MAX_BREWERY_NAME_LENGTH, {
        required: messages.breweryNameRequired,
        tooLong: messages.breweryNameTooLong,
        needsLetter: messages.nameNeedsLetter,
        invalid: messages.nameInvalid,
      }),
    );
    fail("newBreweryCountry", values.newBreweryCountry === "" ? messages.countryRequired : undefined);
    fail("newBreweryCity", checkCity(values.newBreweryCity, messages));
  } else if (brewery === "unset" || values.breweryId === "") {
    fail("breweryId", messages.breweryRequired);
  }

  fail("style", values.style === "" ? messages.styleRequired : undefined);
  fail("abv", checkAbv(values.abv, messages));
  return found;
};

export const toBeerRequest = (values: BeerFormFields, brewery: "new" | "existing" | "unset") => {
  const beer = { name: values.name.trim(), style: values.style, abv: toNumber(values.abv) };
  if (brewery !== "new") {
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
