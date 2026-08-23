import { z } from "zod";
import { applyBottleDateRules } from "./bottleDateRules";
import { containerTypeValues } from "./types";

export const editBottleSchema = z
  .object({
    containerType: z.enum(containerTypeValues),
    brewedDate: z.string().optional(),
    bestBeforeDate: z.string().optional(),
  })
  .superRefine(applyBottleDateRules);

export type EditBottleFormValues = z.infer<typeof editBottleSchema>;
