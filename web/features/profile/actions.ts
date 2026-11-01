"use server";

import { revalidatePath } from "next/cache";
import { signInReturningTo } from "@/lib/auth/signInReturningTo";
import { profileHref } from "@/lib/routes";
import { changeCellarVisibility } from "./api";
import type { Profile } from "./types";

// Do not re-export this from a shared lib/ module instead of defining it
// here: a Server Action re-exported through a second "use server" file
// breaks Next's action-ID resolution — the client sends an ID the server's
// manifest doesn't recognize (UnrecognizedActionError), reproduced live,
// not caught by any test, lint, or build in this repo.
export const startProfileSignIn = async (formData?: FormData) => {
  await signInReturningTo(formData, profileHref);
};

// ADR-0040: must stay a Server Action, or the client build fails.
export const changeVisibilityAction = async (cellarPublic: boolean): Promise<Profile> => {
  const profile = await changeCellarVisibility(cellarPublic);
  revalidatePath("/[locale]/profile", "page");
  return profile;
};
