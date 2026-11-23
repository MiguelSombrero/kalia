import { MAX_BOTTLE_QUANTITY as MAX_QUANTITY, MIN_BOTTLE_QUANTITY as MIN_QUANTITY } from "@kalia/api/bounds";
import { z } from "zod";

import type { TranslationKey } from "@/i18n/translationKey";

import { applyBottleDateRules } from "./bottleDateRules";
import { containerTypeValues } from "./types";

const QUANTITY_RANGE = "cellar.add.error.quantityRange" satisfies TranslationKey;

export { MAX_QUANTITY, MIN_QUANTITY };

// Derived from the generated client, so a container type added backend-side
// reaches the form by regenerating rather than by remembering to edit a list.
export const containerTypes = Object.values(containerTypeValues);

export const addBottleSchema = z
  .object({
    containerType: z.enum(containerTypeValues),
    brewedDate: z.string().optional(),
    bestBeforeDate: z.string().optional(),
    quantity: z
      // The type-level message matters: clearing the input yields NaN, and
      // without it the user is shown Zod's own untranslated English text.
      .number({ error: QUANTITY_RANGE })
      .int(QUANTITY_RANGE)
      .min(MIN_QUANTITY, QUANTITY_RANGE)
      .max(MAX_QUANTITY, QUANTITY_RANGE),
  })
  .superRefine(applyBottleDateRules);

export type AddBottleFormValues = z.infer<typeof addBottleSchema>;
