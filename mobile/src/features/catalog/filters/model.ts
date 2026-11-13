export const SORTS = ["name,asc", "name,desc", "abv,asc", "abv,desc", "style,asc"] as const;
export type Sort = (typeof SORTS)[number];
export const DEFAULT_SORT: Sort = "name,asc";
export const MAX_ABV = 100;
export const MAX_FILTER_LENGTH = 100;

export type Filters = {
  query: string;
  style: string;
  breweryId: string;
  breweryName: string;
  countryCode: string;
  min: string;
  max: string;
  sort: Sort;
};

export const emptyFilters = (): Filters => ({ query: "", style: "", breweryId: "", breweryName: "", countryCode: "", min: "", max: "", sort: DEFAULT_SORT });

export const toNumber = (text: string): number | null => {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  return /^(\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : Number.NaN;
};

export type StrengthError = "order" | "bound";

export const strengthError = (filters: Pick<Filters, "min" | "max">): StrengthError | null => {
  const from = toNumber(filters.min);
  const to = toNumber(filters.max);
  const outOfBounds = (value: number | null) => value !== null && (Number.isNaN(value) || value < 0 || value > MAX_ABV);
  if (outOfBounds(from) || outOfBounds(to)) return "bound";
  if (from !== null && to !== null && from > to) return "order";
  return null;
};

export const hasStrength = (filters: Pick<Filters, "min" | "max">) => filters.min.trim() !== "" || filters.max.trim() !== "";

/** The query is not counted; a sort other than the default is, as on the web. */
export const sheetFilterCount = (filters: Filters) =>
  [filters.style, filters.breweryId, filters.countryCode].filter(Boolean).length + (hasStrength(filters) ? 1 : 0) + (filters.sort !== DEFAULT_SORT ? 1 : 0);

/** A strength range the sheet refuses is left out of the request. */
export const searchParams = (filters: Filters) => {
  const usable = strengthError(filters) === null;
  const from = usable ? toNumber(filters.min) : null;
  const to = usable ? toNumber(filters.max) : null;
  return {
    ...(filters.query.trim() ? { query: filters.query.trim().slice(0, MAX_FILTER_LENGTH) } : {}),
    ...(filters.style ? { style: filters.style } : {}),
    ...(filters.breweryId ? { breweryId: filters.breweryId } : {}),
    ...(filters.countryCode ? { countryCode: filters.countryCode } : {}),
    ...(from !== null ? { minAbv: from } : {}),
    ...(to !== null ? { maxAbv: to } : {}),
    sort: filters.sort,
  };
};

export type ActiveFilterKey = "style" | "brewery" | "country" | "strength" | "sort";

export const removeFilter = (filters: Filters, key: ActiveFilterKey): Filters => {
  if (key === "brewery") return { ...filters, breweryId: "", breweryName: "" };
  if (key === "country") return { ...filters, countryCode: "" };
  if (key === "strength") return { ...filters, min: "", max: "" };
  if (key === "sort") return { ...filters, sort: DEFAULT_SORT };
  return { ...filters, style: "" };
};
