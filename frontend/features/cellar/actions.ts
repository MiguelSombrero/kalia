"use server";

import { signIn } from "@/auth";
import { listCellarBottles } from "./api";
import type { Bottle } from "./types";

// Do not re-export this from a shared lib/ module instead of defining it
// here: a Server Action re-exported through a second "use server" file
// breaks Next's action-ID resolution — the client sends an ID the server's
// manifest doesn't recognize (UnrecognizedActionError), reproduced live,
// not caught by any test, lint, or build in this repo. Mirrors
// features/auth's startSignIn — features cannot import each other
// (frontend/README.md's Structure bullet), so this stays a small duplicate.
export const startCellarSignIn = async () => {
  await signIn("keycloak");
};

// ADR-0040: must stay a Server Action, or the client build fails.
export const listCellarBottlesAction = async (entryId: string): Promise<Bottle[]> => {
  return listCellarBottles(entryId);
};
