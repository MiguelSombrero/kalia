"use server";

import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { changeCellarVisibility } from "./api";
import type { Profile } from "./types";

// Do not re-export this from a shared lib/ module instead of defining it
// here: a Server Action re-exported through a second "use server" file
// breaks Next's action-ID resolution — the client sends an ID the server's
// manifest doesn't recognize (UnrecognizedActionError), reproduced live,
// not caught by any test, lint, or build in this repo. Mirrors
// features/cellar's startCellarSignIn — features cannot import each other
// (frontend/README.md's Structure bullet), so this stays a small duplicate.
export const startProfileSignIn = async () => {
  await signIn("keycloak");
};

// ADR-0040: must stay a Server Action, or the client build fails.
export const changeVisibilityAction = async (cellarPublic: boolean): Promise<Profile> => {
  const profile = await changeCellarVisibility(cellarPublic);
  revalidatePath("/[locale]/profile", "page");
  return profile;
};
