/** The 422 of an add that would pass the cellar's limit, carried as a result: a Server Action's thrown error loses its body. */
export type CellarFull = { cellarFull: true; limit: number; remaining: number };

export const isCellarFull = (result: unknown): result is CellarFull =>
  typeof result === "object" && result !== null && "cellarFull" in result;
