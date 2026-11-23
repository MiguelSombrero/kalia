// A value past a request bound is a 400, not an empty answer.
export const MAX_ABV = 100;
export const MAX_FILTER_LENGTH = 100;
export const MAX_PAGE_SIZE = 100;
export const MAX_OFFSET = 10_000;

export const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export const MAX_BEER_NAME_LENGTH = 200;
export const MAX_BREWERY_NAME_LENGTH = 200;
export const MAX_CITY_LENGTH = 100;
export const NO_CONTROL_OR_INVISIBLE_CHARACTERS = /^[^\p{Cc}\p{Cf}]*$/u;
export const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
export const ABV_FORMAT = /^\d{1,3}(?:[.,]\d+)?$/;
export const ABV_ONE_DECIMAL = /^\d{1,3}(?:[.,]\d)?$/;

export const MIN_BOTTLE_QUANTITY = 1;
export const MAX_BOTTLE_QUANTITY = 24;
export const MAX_BOTTLES_IN_CELLAR = 2000;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);
