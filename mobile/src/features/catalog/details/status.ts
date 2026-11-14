import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "@kalia/api";
import type { BeerDetails } from "../api";

export const statusLabelKey = enumLookup<BeerDetails["status"], string | null>(
  { APPROVED: null, PENDING: "beerDetails.status.pending" },
  UNKNOWN_VALUE_LABEL_KEY,
);
