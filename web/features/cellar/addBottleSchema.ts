import { z } from "zod";
import { applyBottleDateRules } from "./bottleDateRules";
import { containerTypeValues } from "./types";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 24;

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
      .number({ error: "cellar.add.error.quantityRange" })
      .int("cellar.add.error.quantityRange")
      .min(MIN_QUANTITY, "cellar.add.error.quantityRange")
      .max(MAX_QUANTITY, "cellar.add.error.quantityRange"),
  })
  .superRefine(applyBottleDateRules);

export type AddBottleFormValues = z.infer<typeof addBottleSchema>;
