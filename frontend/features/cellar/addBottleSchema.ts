import { z } from "zod";
import type { ContainerType } from "./types";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 24;

export const containerTypes: readonly ContainerType[] = ["BOTTLE", "CAN", "KEG"];

const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const addBottleSchema = z
  .object({
    containerType: z.enum(["BOTTLE", "CAN", "KEG"]),
    brewedDate: z.string().optional(),
    bestBeforeDate: z.string().optional(),
    quantity: z
      .number()
      .int("cellar.add.error.quantityRange")
      .min(MIN_QUANTITY, "cellar.add.error.quantityRange")
      .max(MAX_QUANTITY, "cellar.add.error.quantityRange"),
  })
  .superRefine((values, ctx) => {
    if (values.brewedDate && values.brewedDate > todayIso()) {
      ctx.addIssue({
        code: "custom",
        path: ["brewedDate"],
        message: "cellar.add.error.brewedInFuture",
      });
    }
    if (
      values.brewedDate &&
      values.bestBeforeDate &&
      values.bestBeforeDate <= values.brewedDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bestBeforeDate"],
        message: "cellar.add.error.bestBeforeNotAfterBrewed",
      });
    }
  });

export type AddBottleFormValues = z.infer<typeof addBottleSchema>;
