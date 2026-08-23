import type { z } from "zod";

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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
