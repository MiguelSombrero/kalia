import { httpFailure } from "@kalia/api";
import { listEntries } from "@kalia/api/generated/cellar/cellar";

import type { CellarEntry } from "./types";

export const readCellar = async (): Promise<CellarEntry[]> => {
  const response = await listEntries();
  if (response.status !== 200) {
    throw httpFailure("Cellar read", response);
  }
  return response.data;
};
