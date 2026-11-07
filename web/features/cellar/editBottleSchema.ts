import { z } from "zod";
import { applyBottleDateRules } from "./bottleDateRules";
import type { ContainerType } from "./types";

export const editBottleSchema = z
  .object({
    containerType: z.custom<ContainerType>((value) => typeof value === "string" && value !== ""),
    brewedDate: z.string().optional(),
    bestBeforeDate: z.string().optional(),
  })
  .superRefine(applyBottleDateRules);

export type EditBottleFormValues = z.infer<typeof editBottleSchema>;
