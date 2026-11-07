import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "@kalia/api";
import type { ContainerType } from "./types";

/** i18n key per container type, shared by the owner and public cellars; a type this build does not list reads "Other". */
export const containerLabelKey = enumLookup<ContainerType, string>(
  {
    BOTTLE: "cellar.bottle.container.BOTTLE",
    CAN: "cellar.bottle.container.CAN",
    KEG: "cellar.bottle.container.KEG",
  },
  UNKNOWN_VALUE_LABEL_KEY,
);
