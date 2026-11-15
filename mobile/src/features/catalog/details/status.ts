import { enumLookup, UNKNOWN_VALUE_LABEL_KEY } from "@kalia/api";

import type { TranslationKey } from "@/lib/i18n/translationKey";

import type { BeerDetails } from "../api";

export const statusLabelKey = enumLookup<BeerDetails["status"], TranslationKey | null>(
  { APPROVED: null, PENDING: "beerDetails.status.pending" },
  UNKNOWN_VALUE_LABEL_KEY,
);
