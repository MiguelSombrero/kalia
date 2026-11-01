"use server";

import { revalidatePath } from "next/cache";
import { signInReturningTo } from "@/lib/auth/signInReturningTo";
import { beerHref, ownCellarHref } from "@/lib/routes";
import {
  addBottlesToCellar,
  removeCellarBottle,
  updateCellarBottle,
} from "./api";
import type { AddBottlesRequest, Bottle, UpdateBottleRequest } from "./types";

// Do not re-export this from a shared lib/ module instead of defining it
// here: a Server Action re-exported through a second "use server" file
// breaks Next's action-ID resolution — the client sends an ID the server's
// manifest doesn't recognize (UnrecognizedActionError), reproduced live,
// not caught by any test, lint, or build in this repo.
export const startCellarSignIn = async (formData?: FormData) => {
  // The visitor returns to the beer they clicked, else to their cellar — the
  // page the bare prompt is inviting them to.
  await signInReturningTo(formData, (locale) => {
    const beerId = beerIdFrom(formData);
    return beerId ? beerHref(locale, beerId) : ownCellarHref(locale);
  });
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const beerIdFrom = (formData?: FormData): string | undefined => {
  const beerId = formData?.get("beerId");
  return typeof beerId === "string" && UUID_PATTERN.test(beerId) ? beerId : undefined;
};

export const addBottlesAction = async (request: AddBottlesRequest): Promise<Bottle[]> => {
  const created = await addBottlesToCellar(request);
  revalidatePath("/[locale]/cellar", "page");
  // The catalog's cellar marker is how an add from there confirms itself.
  revalidatePath("/[locale]/beers", "page");
  revalidatePath("/[locale]/beers/[id]", "page");
  return created;
};

export const updateBottleAction = async (
  id: string,
  request: UpdateBottleRequest,
): Promise<Bottle> => {
  const updated = await updateCellarBottle(id, request);
  revalidatePath("/[locale]/cellar", "page");
  return updated;
};

export const removeBottleAction = async (id: string): Promise<void> => {
  await removeCellarBottle(id);
  revalidatePath("/[locale]/cellar", "page");
};
