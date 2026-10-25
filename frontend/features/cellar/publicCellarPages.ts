/** The highest page index the public cellar read accepts: its page-size cap times this stays a bounded scan. */
export const lastPublicCellarPage = 199;

/** A page index from a query string; anything but a whole number from 1 up is the first page. */
export const toPublicCellarPage = (value: string | string[] | undefined): number => {
  const page = typeof value === "string" ? Number(value) : 0;
  return Number.isInteger(page) && page > 0 ? page : 0;
};
