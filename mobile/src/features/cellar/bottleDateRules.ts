import type { z } from "zod";

import type { TranslationKey } from "@/lib/i18n/translationKey";

import { localToday } from "./bottles";

export const applyBottleDateRules = (values: { brewedDate: string | null; bestBeforeDate: string | null }, ctx: z.RefinementCtx) => {
  if (values.brewedDate && values.brewedDate > localToday()) {
    ctx.addIssue({ code: "custom", path: ["brewedDate"], message: "cellar.bottle.dateError.brewedInFuture" satisfies TranslationKey });
  }
  if (values.brewedDate && values.bestBeforeDate && values.bestBeforeDate <= values.brewedDate) {
    ctx.addIssue({ code: "custom", path: ["bestBeforeDate"], message: "cellar.bottle.dateError.bestBeforeNotAfterBrewed" satisfies TranslationKey });
  }
};
