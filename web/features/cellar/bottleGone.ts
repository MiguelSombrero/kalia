/** The 404 of an edit to a bottle that is no longer there, carried as a result: a Server Action's thrown error loses its status. */
export type BottleGone = { gone: true };

export const isBottleGone = (result: unknown): result is BottleGone =>
  typeof result === "object" && result !== null && "gone" in result;
