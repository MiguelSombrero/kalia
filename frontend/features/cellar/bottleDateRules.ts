import type { z } from "zod";

// Local calendar date, not toISOString's UTC one: a caller east of UTC in the
// first hours of their day would otherwise see their own "today" rejected as
// a future brewedDate until UTC catches up.
export const todayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Shared by addBottleSchema and editBottleSchema so the two forms agree. */
export const applyBottleDateRules = (
  values: { brewedDate?: string; bestBeforeDate?: string },
  ctx: z.RefinementCtx,
) => {
  if (values.brewedDate && values.brewedDate > todayIso()) {
    ctx.addIssue({
      code: "custom",
      path: ["brewedDate"],
      message: "cellar.bottle.dateError.brewedInFuture",
    });
  }
  if (values.brewedDate && values.bestBeforeDate && values.bestBeforeDate <= values.brewedDate) {
    ctx.addIssue({
      code: "custom",
      path: ["bestBeforeDate"],
      message: "cellar.bottle.dateError.bestBeforeNotAfterBrewed",
    });
  }
};
