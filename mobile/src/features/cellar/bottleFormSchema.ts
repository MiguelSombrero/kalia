import { MAX_BOTTLE_QUANTITY, MIN_BOTTLE_QUANTITY } from "@kalia/api/bounds";
import { z } from "zod";

import type { TranslationKey } from "@/lib/i18n/translationKey";

import { applyBottleDateRules } from "./bottleDateRules";
import type { Bottle } from "./types";

const QUANTITY_RANGE = "cellar.add.error.quantityRange" satisfies TranslationKey;

export const bottleFormSchema = z
  .object({
    containerType: z.custom<Bottle["containerType"]>((value) => typeof value === "string"),
    brewedDate: z.string().nullable(),
    bestBeforeDate: z.string().nullable(),
    quantity: z.number().int(QUANTITY_RANGE).min(MIN_BOTTLE_QUANTITY, QUANTITY_RANGE).max(MAX_BOTTLE_QUANTITY, QUANTITY_RANGE),
  })
  .superRefine(applyBottleDateRules);

export type BottleFormValues = z.infer<typeof bottleFormSchema>;
export type BottleDetails = Omit<BottleFormValues, "quantity">;
