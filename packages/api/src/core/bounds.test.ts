import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ABV_FORMAT,
  ABV_ONE_DECIMAL,
  COUNTRY_CODE_PATTERN,
  HAS_LETTER_OR_DIGIT,
  isUuid,
  MAX_ABV,
  MAX_BEER_NAME_LENGTH,
  MAX_BOTTLE_QUANTITY,
  MAX_BOTTLES_IN_CELLAR,
  MAX_BREWERY_NAME_LENGTH,
  MAX_CITY_LENGTH,
  MAX_FILTER_LENGTH,
  MAX_OFFSET,
  MAX_PAGE_SIZE,
  MIN_BOTTLE_QUANTITY,
  NO_CONTROL_OR_INVISIBLE_CHARACTERS,
  UUID_PATTERN,
} from "./bounds";

type Schema = { maxLength?: number; minimum?: number; maximum?: number; pattern?: string; example?: unknown; format?: string };
type Parameter = { name: string; schema: Schema };
type Spec = {
  paths: Record<string, Record<string, { parameters?: Parameter[] }>>;
  components: { schemas: Record<string, { properties?: Record<string, Schema> }> };
};

// The committed spec is the served one (CommittedOpenApiSpecIT), so reading it
// needs no running backend. A constant fails here only when it disagrees with a
// bound the spec states; a bound the spec gains that no client imports does not.
const spec = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../backend/openapi.json"), "utf8")) as Spec;

const parameter = (path: string, name: string): Schema => {
  const found = spec.paths[path]?.get?.parameters?.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`${path} has no parameter ${name}`);
  return found.schema;
};

const property = (schema: string, name: string): Schema => {
  const found = spec.components.schemas[schema]?.properties?.[name];
  if (!found) throw new Error(`${schema} has no property ${name}`);
  return found;
};

// A pattern in the spec is anchored by the validator; the client's is anchored
// in its own source, so the two are compared without anchors.
const unanchored = (pattern: RegExp): string => pattern.source.replace(/^\^/, "").replace(/\$$/, "");

describe("the search bounds equal the spec's", () => {
  const search = "/api/v1/beers";

  it.each(["query", "style", "similarTo"])("the %s filter's length", (name) => {
    expect(parameter(search, name).maxLength).toBe(MAX_FILTER_LENGTH);
  });

  it.each(["minAbv", "maxAbv"])("%s", (name) => {
    expect(parameter(search, name).maximum).toBe(MAX_ABV);
  });

  it("the page size", () => {
    expect(parameter(search, "size").maximum).toBe(MAX_PAGE_SIZE);
  });

  it("the furthest page, which is also the result window", () => {
    expect(parameter(search, "page").maximum).toBe(MAX_OFFSET);
  });

  it("the country code", () => {
    expect(parameter(search, "countryCode").pattern).toBe(unanchored(COUNTRY_CODE_PATTERN));
  });
});

describe("the add-beer bounds equal the spec's", () => {
  it.each(["AddBeerRequestDto", "EditSuggestionRequestDto"])("%s's name and strength", (schema) => {
    expect(property(schema, "name").maxLength).toBe(MAX_BEER_NAME_LENGTH);
    expect(property(schema, "abv").maximum).toBe(MAX_ABV);
  });

  it("a new brewery's name, city and country", () => {
    expect(property("NewBreweryRequestDto", "name").maxLength).toBe(MAX_BREWERY_NAME_LENGTH);
    expect(property("NewBreweryRequestDto", "city").maxLength).toBe(MAX_CITY_LENGTH);
    expect(property("NewBreweryRequestDto", "city").pattern).toBe(unanchored(NO_CONTROL_OR_INVISIBLE_CHARACTERS));
    expect(property("NewBreweryRequestDto", "countryCode").pattern).toBe(unanchored(COUNTRY_CODE_PATTERN));
  });
});

describe("the cellar bounds equal the spec's", () => {
  it("the quantity of one add", () => {
    const quantity = property("AddBottleRequestDto", "quantity");
    expect([quantity.minimum, quantity.maximum]).toEqual([MIN_BOTTLE_QUANTITY, MAX_BOTTLE_QUANTITY]);
  });

  // The spec states the limit as an example, not as a `maximum`.
  it("the bottles a cellar holds", () => {
    expect(property("CellarFullProblem", "limit").example).toBe(MAX_BOTTLES_IN_CELLAR);
  });
});

// A Java annotation the spec does not carry cannot be compared, so these are
// pinned to what the server accepts instead, and named as unguarded in the PR.
describe("the patterns the spec does not state", () => {
  it("an id is a UUID, as the spec's `format` says", () => {
    const catalog = spec.paths["/api/v1/beers/{id}"]?.get?.parameters?.find((candidate) => candidate.name === "id");
    expect(catalog?.schema.format).toBe("uuid");
    expect(isUuid("3f2b8a52-1c6e-4f7a-9d1e-0a5b6c7d8e9f")).toBe(true);
    expect(isUuid("3F2B8A52-1C6E-4F7A-9D1E-0A5B6C7D8E9F")).toBe(true);
    expect(isUuid("not-a-beer")).toBe(false);
    expect(isUuid("3f2b8a52-1c6e-4f7a-9d1e-0a5b6c7d8e9f0")).toBe(false);
    expect(UUID_PATTERN.test("../3f2b8a52-1c6e-4f7a-9d1e-0a5b6c7d8e9f")).toBe(false);
  });

  it("a name needs a letter or a digit", () => {
    expect(HAS_LETTER_OR_DIGIT.test("---")).toBe(false);
    expect(HAS_LETTER_OR_DIGIT.test("Ö 7")).toBe(true);
  });

  it("a strength has at most three integer digits and one decimal", () => {
    expect(ABV_FORMAT.test("5.25")).toBe(true);
    expect(ABV_ONE_DECIMAL.test("5.25")).toBe(false);
    expect(ABV_ONE_DECIMAL.test("5,2")).toBe(true);
    expect(ABV_ONE_DECIMAL.test("1000")).toBe(false);
  });
});
