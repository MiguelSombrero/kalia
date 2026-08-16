"use server";

import { startSignIn } from "@/lib/auth/startSignIn";
import { listCellarBottles } from "./api";
import type { Bottle } from "./types";

export { startSignIn as startCellarSignIn };

// ADR-0040: must stay a Server Action, or the client build fails.
export const listCellarBottlesAction = async (entryId: string): Promise<Bottle[]> => {
  return listCellarBottles(entryId);
};
