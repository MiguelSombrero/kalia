"use server";

import { revalidatePath } from "next/cache";
import { signIn } from "@/auth";
import { defaultLocale, isLocale, type Locale } from "@/i18n/settings";
import {
  addBottlesToCellar,
  listCellarBottles,
  removeCellarBottle,
  updateCellarBottle,
} from "./api";
import type { AddBottlesRequest, Bottle, UpdateBottleRequest } from "./types";

// Do not re-export this from a shared lib/ module instead of defining it
// here: a Server Action re-exported through a second "use server" file
// breaks Next's action-ID resolution — the client sends an ID the server's
// manifest doesn't recognize (UnrecognizedActionError), reproduced live,
// not caught by any test, lint, or build in this repo. Mirrors
// features/auth's startSignIn — features cannot import each other
// (frontend/README.md's Structure bullet), so this stays a small duplicate.
export const startCellarSignIn = async (formData?: FormData) => {
  const locale = localeFromForm(formData);
  // `ui_locales` picks the Keycloak page language (ADR-0056); the return
  // path keeps the visitor on the beer they clicked, else on their cellar —
  // the page the bare prompt is inviting them to.
  const redirectTo = beerReturnPath(formData) ?? `/${locale}/cellar`;
  await signIn("keycloak", { redirectTo }, { ui_locales: locale });
};

const localeFromForm = (formData?: FormData): Locale => {
  const locale = formData?.get("locale");
  return typeof locale === "string" && isLocale(locale) ? locale : defaultLocale;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rebuilt from validated parts, never taken as a path: these fields reach the
// server from a client-rendered form, and handing signIn's redirectTo a
// caller-supplied string is an open redirect.
const beerReturnPath = (formData?: FormData): string | undefined => {
  const beerId = formData?.get("beerId");
  const locale = formData?.get("locale");
  if (typeof beerId !== "string" || !UUID_PATTERN.test(beerId)) {
    return undefined;
  }
  if (typeof locale !== "string" || !isLocale(locale)) {
    return undefined;
  }
  return `/${locale}/beers/${beerId}`;
};

// ADR-0040: must stay a Server Action, or the client build fails.
export const listCellarBottlesAction = async (entryId: string): Promise<Bottle[]> => {
  return listCellarBottles(entryId);
};

export const addBottlesAction = async (request: AddBottlesRequest): Promise<Bottle[]> => {
  const created = await addBottlesToCellar(request);
  revalidatePath("/[locale]/cellar", "page");
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
